import { getPriceRadarDb } from "./db";
import type {
  Availability,
  HistoryRange,
  PriceHistoryPoint,
  PriceHistoryResponse,
  PriceRadarProductListItem,
  ProductRow,
} from "./types";
import { computeScore, priorityToIntervalMinutes, scoreToPriority } from "./score";

function rowToProduct(row: Record<string, unknown>): ProductRow {
  return {
    id: Number(row.id),
    asin: String(row.asin),
    source: String(row.source),
    url: String(row.url),
    canonical_url: row.canonical_url != null ? String(row.canonical_url) : null,
    title: row.title != null ? String(row.title) : null,
    brand: row.brand != null ? String(row.brand) : null,
    category: row.category != null ? String(row.category) : null,
    image_url: row.image_url != null ? String(row.image_url) : null,
    current_price: row.current_price != null ? Number(row.current_price) : null,
    currency: String(row.currency ?? "EUR"),
    availability: String(row.availability ?? "unknown"),
    last_seen_at: row.last_seen_at != null ? String(row.last_seen_at) : null,
    last_checked_at: row.last_checked_at != null ? String(row.last_checked_at) : null,
    last_price_change_at: row.last_price_change_at != null ? String(row.last_price_change_at) : null,
    first_tracked_at: String(row.first_tracked_at),
    tracking_status: String(row.tracking_status),
    priority_level: String(row.priority_level),
    score: Number(row.score ?? 0),
    check_interval_minutes: Number(row.check_interval_minutes ?? 2880),
    next_check_at: String(row.next_check_at),
    consecutive_failures: Number(row.consecutive_failures ?? 0),
    last_error: row.last_error != null ? String(row.last_error) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function parseAvailability(v: string): Availability {
  if (v === "in_stock" || v === "out_of_stock" || v === "unknown") return v;
  return "unknown";
}

function parsePriority(v: string): "hot" | "warm" | "cold" {
  if (v === "hot" || v === "warm" || v === "cold") return v;
  return "cold";
}

function discountVsPeak(current: number | null, maxInRange: number | null): number {
  if (current == null || maxInRange == null || maxInRange <= 0 || current >= maxInRange) return 0;
  return Math.round(((maxInRange - current) / maxInRange) * 100);
}

export interface ListProductsParams {
  search?: string;
  sort?: "discount" | "newest" | "price" | "priority";
  priority?: "hot" | "warm" | "cold" | "all";
}

export function listProducts(params: ListProductsParams): PriceRadarProductListItem[] {
  const db = getPriceRadarDb();
  let sql = `
    SELECT
      p.*,
      (
        SELECT MAX(ph.price)
        FROM price_history ph
        WHERE ph.product_id = p.id
          AND ph.detected_at >= datetime('now', '-30 days')
      ) AS max_30d,
      (
        SELECT MIN(ph.price)
        FROM price_history ph
        WHERE ph.product_id = p.id
          AND ph.detected_at >= datetime('now', '-30 days')
      ) AS min_30d
    FROM products p
    WHERE p.tracking_status = 'active'
  `;
  const q = params.search?.trim();
  const binds: (string | number)[] = [];
  if (q) {
    sql += ` AND (LOWER(IFNULL(p.title,'')) LIKE ? OR LOWER(p.asin) LIKE ?)`;
    const like = `%${q.toLowerCase()}%`;
    binds.push(like, like);
  }
  if (params.priority && params.priority !== "all") {
    sql += ` AND p.priority_level = ?`;
    binds.push(params.priority);
  }
  const rows = db.prepare(sql).all(...binds) as Record<string, unknown>[];
  const items: PriceRadarProductListItem[] = rows.map((row) => {
    const p = rowToProduct(row);
    const max30 = row.max_30d != null ? Number(row.max_30d) : null;
    const min30 = row.min_30d != null ? Number(row.min_30d) : null;
    return {
      id: p.id,
      asin: p.asin,
      title: p.title,
      image_url: p.image_url,
      url: p.url,
      current_price: p.current_price,
      currency: p.currency,
      availability: parseAvailability(p.availability),
      min_price_30d: min30,
      max_price_30d: max30,
      discount_percent: discountVsPeak(p.current_price, max30),
      last_checked_at: p.last_checked_at,
      last_price_change_at: p.last_price_change_at,
      priority_level: parsePriority(p.priority_level),
      score: p.score,
    };
  });
  const sort = params.sort ?? "discount";
  const copy = [...items];
  switch (sort) {
    case "price":
      copy.sort((a, b) => (a.current_price ?? Infinity) - (b.current_price ?? Infinity));
      break;
    case "newest":
      copy.sort(
        (a, b) =>
          new Date(b.last_price_change_at ?? b.last_checked_at ?? 0).getTime() -
          new Date(a.last_price_change_at ?? a.last_checked_at ?? 0).getTime()
      );
      break;
    case "priority": {
      const rank = { hot: 0, warm: 1, cold: 2 };
      copy.sort((a, b) => {
        const ra = rank[a.priority_level];
        const rb = rank[b.priority_level];
        if (ra !== rb) return ra - rb;
        return b.score - a.score;
      });
      break;
    }
    default:
      copy.sort((a, b) => b.discount_percent - a.discount_percent);
  }
  return copy;
}

export function getProductById(id: number): ProductRow | null {
  const db = getPriceRadarDb();
  const row = db.prepare(`SELECT * FROM products WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
  return row ? rowToProduct(row) : null;
}

export function getProductByAsin(asin: string): ProductRow | null {
  const db = getPriceRadarDb();
  const row = db
    .prepare(`SELECT * FROM products WHERE asin = ? AND source = 'amazon_it' LIMIT 1`)
    .get(asin) as Record<string, unknown> | undefined;
  return row ? rowToProduct(row) : null;
}

function rangeToSqlClause(range: HistoryRange): string {
  switch (range) {
    case "7d":
      return `datetime('now', '-7 days')`;
    case "30d":
      return `datetime('now', '-30 days')`;
    case "90d":
      return `datetime('now', '-90 days')`;
    default:
      return `'1970-01-01'`;
  }
}

export function getPriceHistory(productId: number, range: HistoryRange): PriceHistoryResponse {
  const db = getPriceRadarDb();
  const since = rangeToSqlClause(range);
  const rows = db
    .prepare(
      `SELECT price, detected_at AS t
       FROM price_history
       WHERE product_id = ? AND detected_at >= ${since}
       ORDER BY detected_at ASC`
    )
    .all(productId) as { price: number; t: string }[];

  const points: PriceHistoryPoint[] = rows.map((r) => ({ t: r.t, price: Number(r.price) }));

  const prices = points.map((p) => p.price).filter((n) => n > 0);
  const product = getProductById(productId);
  const current = product?.current_price != null && product.current_price > 0 ? product.current_price : null;

  let min: number | null = null;
  let max: number | null = null;
  let avg: number | null = null;
  if (prices.length > 0) {
    min = Math.min(...prices);
    max = Math.max(...prices);
    avg = prices.reduce((a, b) => a + b, 0) / prices.length;
  }

  return {
    range,
    points,
    stats: {
      current,
      min,
      max,
      avg: avg != null ? Math.round(avg * 100) / 100 : null,
    },
  };
}

interface MetricsSnapshot {
  views_24h: number;
  clicks_24h: number;
  article_mentions: number;
  manual_boost: number;
}

function getMetricsForProduct(db: ReturnType<typeof getPriceRadarDb>, productId: number): MetricsSnapshot {
  const row = db
    .prepare(
      `SELECT views_24h, clicks_24h, article_mentions, manual_boost
       FROM product_metrics WHERE product_id = ?`
    )
    .get(productId) as MetricsSnapshot | undefined;
  return row ?? { views_24h: 0, clicks_24h: 0, article_mentions: 0, manual_boost: 0 };
}

function ensureMetricsRow(db: ReturnType<typeof getPriceRadarDb>, productId: number): void {
  db.prepare(
    `INSERT OR IGNORE INTO product_metrics (product_id, views_24h, clicks_24h, article_mentions, manual_boost, updated_at)
     VALUES (?, 0, 0, 0, 0, datetime('now'))`
  ).run(productId);
}

/** Ricalcola priorità per tutti i prodotti attivi (utile prima del batch cron). */
export function refreshAllActiveProductPriorities(): void {
  const db = getPriceRadarDb();
  const rows = db.prepare(`SELECT id FROM products WHERE tracking_status = 'active'`).all() as { id: number }[];
  for (const { id } of rows) {
    refreshProductPriorityFromMetrics(id);
  }
}

/** Ricalcola score / priorità / intervallo su products. */
export function refreshProductPriorityFromMetrics(productId: number): void {
  const db = getPriceRadarDb();
  ensureMetricsRow(db, productId);
  const m = getMetricsForProduct(db, productId);
  const prow = db.prepare(`SELECT last_price_change_at FROM products WHERE id = ?`).get(productId) as
    | { last_price_change_at: string | null }
    | undefined;
  const score = computeScore({
    views24h: m.views_24h,
    clicks24h: m.clicks_24h,
    articleMentions: m.article_mentions,
    manualBoost: m.manual_boost,
    lastPriceChangeAt: prow?.last_price_change_at ?? null,
  });
  const level = scoreToPriority(score);
  const interval = priorityToIntervalMinutes(level);
  db.prepare(
    `UPDATE products SET
      score = ?,
      priority_level = ?,
      check_interval_minutes = ?,
      updated_at = datetime('now')
     WHERE id = ?`
  ).run(score, level, interval, productId);
}

const DAY_SEC = 86400;

function nowUnix(): number {
  return Math.floor(Date.now() / 1000);
}

function periodExpired(periodStart: string | null): boolean {
  if (!periodStart) return true;
  const t = Math.floor(new Date(periodStart).getTime() / 1000);
  if (Number.isNaN(t)) return true;
  return nowUnix() - t >= DAY_SEC;
}

export function incrementProductView(productId: number): void {
  const db = getPriceRadarDb();
  ensureMetricsRow(db, productId);
  const row = db
    .prepare(
      `SELECT views_24h, views_period_start FROM product_metrics WHERE product_id = ?`
    )
    .get(productId) as { views_24h: number; views_period_start: string | null };

  if (periodExpired(row.views_period_start)) {
    db.prepare(
      `UPDATE product_metrics SET
        views_24h = 1,
        views_period_start = datetime('now'),
        last_interest_at = datetime('now'),
        updated_at = datetime('now')
       WHERE product_id = ?`
    ).run(productId);
  } else {
    db.prepare(
      `UPDATE product_metrics SET
        views_24h = views_24h + 1,
        last_interest_at = datetime('now'),
        updated_at = datetime('now')
       WHERE product_id = ?`
    ).run(productId);
  }
  refreshProductPriorityFromMetrics(productId);
}

export function incrementProductClick(productId: number): void {
  const db = getPriceRadarDb();
  ensureMetricsRow(db, productId);
  const row = db
    .prepare(
      `SELECT clicks_24h, clicks_period_start FROM product_metrics WHERE product_id = ?`
    )
    .get(productId) as { clicks_24h: number; clicks_period_start: string | null };

  if (periodExpired(row.clicks_period_start)) {
    db.prepare(
      `UPDATE product_metrics SET
        clicks_24h = 1,
        clicks_period_start = datetime('now'),
        last_interest_at = datetime('now'),
        updated_at = datetime('now')
       WHERE product_id = ?`
    ).run(productId);
  } else {
    db.prepare(
      `UPDATE product_metrics SET
        clicks_24h = clicks_24h + 1,
        last_interest_at = datetime('now'),
        updated_at = datetime('now')
       WHERE product_id = ?`
    ).run(productId);
  }
  refreshProductPriorityFromMetrics(productId);
}

export function getDetailExtras(productId: number): { min_price_30d: number | null; discount_percent: number } {
  const db = getPriceRadarDb();
  const row = db
    .prepare(
      `SELECT
        (SELECT MAX(ph.price) FROM price_history ph
         WHERE ph.product_id = ? AND ph.detected_at >= datetime('now', '-30 days')) AS max_30d,
        (SELECT MIN(ph.price) FROM price_history ph
         WHERE ph.product_id = ? AND ph.detected_at >= datetime('now', '-30 days')) AS min_30d`
    )
    .get(productId, productId) as { max_30d: number | null; min_30d: number | null };
  const p = getProductById(productId);
  const max30 = row?.max_30d != null ? Number(row.max_30d) : null;
  return {
    min_price_30d: row?.min_30d != null ? Number(row.min_30d) : null,
    discount_percent: discountVsPeak(p?.current_price ?? null, max30),
  };
}
