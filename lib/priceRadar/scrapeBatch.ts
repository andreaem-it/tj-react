import crypto from "node:crypto";
import type Database from "better-sqlite3";
import { getPriceRadarDb } from "./db";
import { parseAmazonItProductHtml } from "./parsers/amazonItParser";
import { fetchHtml, randomScrapeDelay } from "./scraper/httpClient";
import {
  refreshAllActiveProductPriorities,
  refreshProductPriorityFromMetrics,
} from "./productQueries";

const BATCH_DEFAULT = 8;
const FAILURE_PAUSE_CAP_MIN = 7 * 24 * 60;
const PAUSE_AFTER_FAILURES = 8;

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

function sqliteNowPlusMinutes(db: Database.Database, minutes: number): string {
  const row = db
    .prepare(`SELECT datetime('now', ?) AS t`)
    .get(`+${Math.floor(minutes)} minutes`) as { t: string };
  return row.t;
}

function lastHistorySnapshot(db: Database.Database, productId: number): string | null {
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
  const db = getPriceRadarDb();
  refreshAllActiveProductPriorities();

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
    .all(batchSize) as ProductDueRow[];

  let processed = 0;
  let errors = 0;

  for (const p of rows) {
    await randomScrapeDelay(delayMin, delayMax);

    const fetchUrl = (p.canonical_url?.trim() || p.url).trim();
    const startedAt = db.prepare(`SELECT datetime('now') AS t`).get() as { t: string };
    const runInsert = db.prepare(
      `INSERT INTO scrape_runs (product_id, started_at, status, parser_used, price_found)
       VALUES (?, ?, 'running', '', 0)`
    );
    const runResult = runInsert.run(p.id, startedAt.t);
    const runId = Number(runResult.lastInsertRowid);

    if (p.source !== "amazon_it") {
      db.prepare(
        `UPDATE scrape_runs SET finished_at = datetime('now'), status = 'skipped', error_message = ?
         WHERE id = ?`
      ).run("Sorgente non supportata dallo scraper", runId);
      continue;
    }

    let httpCode: number | null = null;
    let body = "";
    try {
      const res = await fetchHtml(fetchUrl);
      httpCode = res.status;
      body = res.body;
      const hash = responseHash(body);
      const parsed = parseAmazonItProductHtml(body);

      if (parsed.price == null || parsed.price <= 0) {
        const failures = p.consecutive_failures + 1;
        const backoff = Math.min(FAILURE_PAUSE_CAP_MIN, p.check_interval_minutes + failures * 30);
        const nextAt = sqliteNowPlusMinutes(db, backoff);
        const paused = failures >= PAUSE_AFTER_FAILURES;

        db.prepare(
          `UPDATE scrape_runs SET finished_at = datetime('now'), status = 'error', http_code = ?,
            parser_used = ?, price_found = 0, error_message = ?, response_hash = ?
           WHERE id = ?`
        ).run(
          httpCode,
          parsed.parserUsed,
          "Prezzo non trovato o pari a zero",
          hash,
          runId
        );

        db.prepare(
          `UPDATE products SET
            last_checked_at = datetime('now'),
            consecutive_failures = ?,
            last_error = ?,
            availability = 'unknown',
            next_check_at = ?,
            tracking_status = ?,
            updated_at = datetime('now')
           WHERE id = ?`
        ).run(
          failures,
          "Prezzo non trovato",
          nextAt,
          paused ? "paused" : "active",
          p.id
        );
        errors++;
        processed++;
        continue;
      }

      const price = parsed.price;
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

      refreshProductPriorityFromMetrics(p.id);

      const intervalRow = db
        .prepare(`SELECT check_interval_minutes FROM products WHERE id = ?`)
        .get(p.id) as { check_interval_minutes: number };
      const minutes = Math.max(15, intervalRow.check_interval_minutes || 180);
      const nextOk = sqliteNowPlusMinutes(db, minutes);
      db.prepare(`UPDATE products SET next_check_at = ?, updated_at = datetime('now') WHERE id = ?`).run(
        nextOk,
        p.id
      );

      db.prepare(
        `UPDATE scrape_runs SET finished_at = datetime('now'), status = 'ok', http_code = ?,
          parser_used = ?, price_found = 1, response_hash = ?, error_message = NULL
         WHERE id = ?`
      ).run(httpCode, parsed.parserUsed, responseHash(body), runId);
      processed++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const failures = p.consecutive_failures + 1;
      const backoff = Math.min(FAILURE_PAUSE_CAP_MIN, p.check_interval_minutes + failures * 30);
      const nextAt = sqliteNowPlusMinutes(db, backoff);
      const paused = failures >= PAUSE_AFTER_FAILURES;

      db.prepare(
        `UPDATE scrape_runs SET finished_at = datetime('now'), status = 'error', http_code = ?,
          error_message = ?, parser_used = 'none', price_found = 0
         WHERE id = ?`
      ).run(httpCode, msg.slice(0, 500), runId);

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
