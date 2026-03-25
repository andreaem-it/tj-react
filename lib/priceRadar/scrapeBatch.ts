import crypto from "node:crypto";
import { getPriceRadarDb, type PriceRadarDb } from "./db";
import { handlePriceEvent } from "./priceEvents";
import { getMinPrice, getPriceVolatility } from "./priceIntelligence";
import { parseAmazonItProductHtml } from "./parsers/amazonItParser";
import { fetchHtml, randomScrapeDelay } from "./scraper/httpClient";
import {
  refreshAllActiveProductPriorities,
  refreshProductPriorityFromMetrics,
} from "./productQueries";
import { computeNextCheckMinutes } from "./scheduler";
import type { PriorityLevel } from "./types";

const BATCH_DEFAULT = 8;
const FAILURE_PAUSE_CAP_MIN = 7 * 24 * 60;
const PAUSE_AFTER_FAILURES = 8;
/** Sotto questa soglia, con prezzo già noto, non si aggiorna il listino (fail-safe). */
const MIN_PARSER_CONFIDENCE_WITH_EXISTING_PRICE = 0.22;

interface ProductDueRow {
  id: number;
  url: string;
  canonical_url: string | null;
  current_price: number | null;
  currency: string;
  availability: string;
  check_interval_minutes: number;
  consecutive_failures: number;
  source: string;
}

function responseHash(body: string): string {
  const slice = body.slice(0, 50_000);
  return crypto.createHash("md5").update(slice, "utf8").digest("hex");
}

function sqliteNowPlusMinutes(db: PriceRadarDb, minutes: number): string {
  const row = db
    .prepare(`SELECT datetime('now', ?) AS t`)
    .get(`+${Math.floor(minutes)} minutes`) as { t: string };
  return row.t;
}

function lastHistorySnapshot(db: PriceRadarDb, productId: number): string | null {
  const row = db
    .prepare(
      `SELECT detected_at FROM price_history WHERE product_id = ? ORDER BY detected_at DESC LIMIT 1`
    )
    .get(productId) as { detected_at: string } | undefined;
  return row?.detected_at ?? null;
}

function hoursSince(iso: string | null): number {
  if (!iso) return 1e9;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 1e9;
  return (Date.now() - t) / (1000 * 60 * 60);
}

function mapAvailability(
  s: string
): "in_stock" | "out_of_stock" | "unknown" {
  if (s === "in_stock" || s === "out_of_stock" || s === "unknown") return s;
  return "unknown";
}

function shouldInsertHistory(params: {
  oldPrice: number | null;
  newPrice: number;
  oldAvail: string;
  newAvail: string;
  lastSnapshotAt: string | null;
}): boolean {
  const priceChanged =
    params.oldPrice == null ||
    Math.abs(params.oldPrice - params.newPrice) > 0.009;
  const availChanged = mapAvailability(params.oldAvail) !== mapAvailability(params.newAvail);
  const stale = hoursSince(params.lastSnapshotAt) >= 24;
  return priceChanged || availChanged || stale;
}

export interface ScrapeBatchOptions {
  batchSize?: number;
  delayMinMs?: number;
  delayMaxMs?: number;
}

/**
 * Seleziona prodotti attivi con next_check_at scaduto, ordina per priorità/score,
 * esegue scraping prudente (batch piccolo), aggiorna DB, storico e backoff.
 */
export async function runPriceRadarScrapeBatch(options?: ScrapeBatchOptions): Promise<{
  processed: number;
  errors: number;
}> {
  const db = await getPriceRadarDb();
  await refreshAllActiveProductPriorities();

  const batchSize =
    options?.batchSize ??
    Math.min(
      10,
      Math.max(5, Number(process.env.PRICE_RADAR_BATCH_SIZE) || BATCH_DEFAULT)
    );
  const delayMin = options?.delayMinMs ?? 2000;
  const delayMax = options?.delayMaxMs ?? 6000;

  const rows = db
    .prepare(
      `SELECT id, url, canonical_url, current_price, currency, availability,
              check_interval_minutes, consecutive_failures, source
       FROM products
       WHERE tracking_status = 'active'
         AND datetime(next_check_at) <= datetime('now')
       ORDER BY
         CASE priority_level WHEN 'hot' THEN 1 WHEN 'warm' THEN 2 ELSE 3 END,
         score DESC,
         next_check_at ASC
       LIMIT ?`
    )
    .all(batchSize) as unknown as ProductDueRow[];

  let processed = 0;
  let errors = 0;

  for (const p of rows) {
    await randomScrapeDelay(delayMin, delayMax);

    const fetchUrl = (p.canonical_url?.trim() || p.url).trim();
    const startedAt = db.prepare(`SELECT datetime('now') AS t`).get() as { t: string };
    const runInsert = db.prepare(
      `INSERT INTO scrape_runs (product_id, started_at, status, parser_used, price_found, response_time_ms, parser_confidence)
       VALUES (?, ?, 'running', '', 0, NULL, NULL)`
    );
    const runResult = runInsert.run(p.id, startedAt.t);
    const runId = Number(runResult.lastInsertRowid);

    if (p.source !== "amazon_it") {
      db.prepare(
        `UPDATE scrape_runs SET finished_at = datetime('now'), status = 'skipped', error_message = ?,
          response_time_ms = 0, parser_confidence = 0
         WHERE id = ?`
      ).run("Sorgente non supportata dallo scraper", runId);
      continue;
    }

    let httpCode: number | null = null;
    let body = "";
    let elapsedMs = 0;
    try {
      const res = await fetchHtml(fetchUrl);
      httpCode = res.status;
      body = res.body;
      elapsedMs = res.elapsedMs;
      const hash = responseHash(body);
      const parsed = parseAmazonItProductHtml(body);

      const hadValidPrice = p.current_price != null && p.current_price > 0;
      const parseFailed =
        parsed.price == null ||
        parsed.price <= 0 ||
        (hadValidPrice && parsed.confidence < MIN_PARSER_CONFIDENCE_WITH_EXISTING_PRICE);

      if (parseFailed) {
        const failures = p.consecutive_failures + 1;
        const cooldown = Math.min(
          FAILURE_PAUSE_CAP_MIN,
          p.check_interval_minutes + failures * 45
        );
        const nextAt = sqliteNowPlusMinutes(db, cooldown);
        const paused = failures >= PAUSE_AFTER_FAILURES;

        const errMsg =
          parsed.price == null || parsed.price <= 0
            ? "Prezzo non trovato o pari a zero"
            : "Confidenza parser troppo bassa";

        db.prepare(
          `UPDATE scrape_runs SET finished_at = datetime('now'), status = 'error', http_code = ?,
            parser_used = ?, price_found = 0, error_message = ?, response_hash = ?,
            response_time_ms = ?, parser_confidence = ?
           WHERE id = ?`
        ).run(
          httpCode,
          parsed.parserUsed,
          errMsg,
          hash,
          elapsedMs,
          parsed.confidence,
          runId
        );

        db.prepare(
          `UPDATE products SET
            last_checked_at = datetime('now'),
            consecutive_failures = ?,
            last_error = ?,
            next_check_at = ?,
            tracking_status = ?,
            updated_at = datetime('now')
           WHERE id = ?`
        ).run(
          failures,
          errMsg.slice(0, 500),
          nextAt,
          paused ? "paused" : "active",
          p.id
        );

        if (!hadValidPrice) {
          db.prepare(
            `UPDATE products SET availability = 'unknown', updated_at = datetime('now') WHERE id = ?`
          ).run(p.id);
        }
        errors++;
        processed++;
        continue;
      }

      const price = parsed.price!;
      const newAvail = parsed.availability;
      const oldAvail = p.availability;
      const lastSnap = lastHistorySnapshot(db, p.id);
      const recordHistory = shouldInsertHistory({
        oldPrice: p.current_price,
        newPrice: price,
        oldAvail,
        newAvail,
        lastSnapshotAt: lastSnap,
      });

      const priceChanged =
        p.current_price == null || Math.abs(p.current_price - price) > 0.009;

      const prevMin30 = await getMinPrice(p.id, 30);

      if (recordHistory) {
        const isAvailInt = newAvail === "in_stock" ? 1 : newAvail === "out_of_stock" ? 0 : 1;
        db.prepare(
          `INSERT INTO price_history (product_id, price, currency, detected_at, source_type, is_available, raw_price_text)
           VALUES (?, ?, ?, datetime('now'), 'scrape', ?, ?)`
        ).run(p.id, price, parsed.currency, isAvailInt, parsed.rawPriceText ?? "");
      }

      const prevLpc = db
        .prepare(`SELECT last_price_change_at FROM products WHERE id = ?`)
        .get(p.id) as { last_price_change_at: string | null };
      const nowRow = db.prepare(`SELECT datetime('now') AS t`).get() as { t: string };
      const newLastPriceChangeAt = priceChanged ? nowRow.t : prevLpc.last_price_change_at;

      db.prepare(
        `UPDATE products SET
          current_price = ?,
          currency = ?,
          availability = ?,
          title = COALESCE(?, title),
          image_url = COALESCE(?, image_url),
          canonical_url = COALESCE(?, canonical_url),
          last_seen_at = datetime('now'),
          last_checked_at = datetime('now'),
          last_price_change_at = ?,
          consecutive_failures = 0,
          last_error = NULL,
          updated_at = datetime('now')
         WHERE id = ?`
      ).run(
        price,
        parsed.currency,
        newAvail,
        parsed.title,
        parsed.imageUrl,
        fetchUrl !== p.url ? fetchUrl : null,
        newLastPriceChangeAt,
        p.id
      );

      if (priceChanged) {
        await handlePriceEvent(p.id, p.current_price, price, prevMin30);
      }
      await refreshProductPriorityFromMetrics(p.id);

      const vol = await getPriceVolatility(p.id, 30);
      const plRow = db
        .prepare(`SELECT priority_level FROM products WHERE id = ?`)
        .get(p.id) as { priority_level: string };
      const level = (plRow?.priority_level ?? "cold") as PriorityLevel;
      const minutes = computeNextCheckMinutes({
        volatility: vol,
        priorityLevel: level,
      });
      const nextOk = sqliteNowPlusMinutes(db, minutes);
      db.prepare(
        `UPDATE products SET next_check_at = ?, check_interval_minutes = ?, updated_at = datetime('now') WHERE id = ?`
      ).run(nextOk, minutes, p.id);

      db.prepare(
        `UPDATE scrape_runs SET finished_at = datetime('now'), status = 'ok', http_code = ?,
          parser_used = ?, price_found = 1, response_hash = ?, error_message = NULL,
          response_time_ms = ?, parser_confidence = ?
         WHERE id = ?`
      ).run(httpCode, parsed.parserUsed, hash, elapsedMs, parsed.confidence, runId);
      processed++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const failures = p.consecutive_failures + 1;
      const cooldown = Math.min(
        FAILURE_PAUSE_CAP_MIN,
        p.check_interval_minutes + failures * 45
      );
      const nextAt = sqliteNowPlusMinutes(db, cooldown);
      const paused = failures >= PAUSE_AFTER_FAILURES;

      db.prepare(
        `UPDATE scrape_runs SET finished_at = datetime('now'), status = 'error', http_code = ?,
          error_message = ?, parser_used = 'none', price_found = 0,
          response_time_ms = ?, parser_confidence = 0
         WHERE id = ?`
      ).run(httpCode, msg.slice(0, 500), elapsedMs, runId);

      db.prepare(
        `UPDATE products SET
          last_checked_at = datetime('now'),
          consecutive_failures = ?,
          last_error = ?,
          next_check_at = ?,
          tracking_status = ?,
          updated_at = datetime('now')
         WHERE id = ?`
      ).run(failures, msg.slice(0, 500), nextAt, paused ? "paused" : "active", p.id);
      errors++;
      processed++;
    }
  }

  return { processed, errors };
}
