import { getPriceRadarDb } from "./db";
import type { ProductRow } from "./types";
import { getProductById, refreshProductPriorityFromMetrics } from "./productQueries";

export interface AdminProductRow extends ProductRow {
  views_24h: number;
  clicks_24h: number;
  article_mentions: number;
  manual_boost: number;
}

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

export interface ListAdminProductsParams {
  search?: string;
  status?: "all" | "active" | "paused";
}

export function listProductsAdmin(params: ListAdminProductsParams): AdminProductRow[] {
  const db = getPriceRadarDb();
  let sql = `
    SELECT p.*,
      COALESCE(m.views_24h, 0) AS views_24h,
      COALESCE(m.clicks_24h, 0) AS clicks_24h,
      COALESCE(m.article_mentions, 0) AS article_mentions,
      COALESCE(m.manual_boost, 0) AS manual_boost
    FROM products p
    LEFT JOIN product_metrics m ON m.product_id = p.id
    WHERE 1=1
  `;
  const binds: (string | number)[] = [];
  const q = params.search?.trim();
  if (q) {
    sql += ` AND (LOWER(COALESCE(p.title,'')) LIKE ? OR LOWER(p.asin) LIKE ?)`;
    const like = `%${q.toLowerCase()}%`;
    binds.push(like, like);
  }
  if (params.status === "active") {
    sql += ` AND p.tracking_status = 'active'`;
  } else if (params.status === "paused") {
    sql += ` AND p.tracking_status = 'paused'`;
  }
  sql += ` ORDER BY p.updated_at DESC`;
  const rows = db.prepare(sql).all(...binds) as Record<string, unknown>[];
  return rows.map((row) => {
    const p = rowToProduct(row);
    return {
      ...p,
      views_24h: Number(row.views_24h ?? 0),
      clicks_24h: Number(row.clicks_24h ?? 0),
      article_mentions: Number(row.article_mentions ?? 0),
      manual_boost: Number(row.manual_boost ?? 0),
    };
  });
}

export function getAdminStatus(): {
  dbConfigured: boolean;
  productCount: number;
  activeCount: number;
  pausedCount: number;
  batchSize: number;
} {
  const db = getPriceRadarDb();
  const productCount = Number(
    (db.prepare(`SELECT COUNT(*) AS c FROM products`).get() as { c: number }).c
  );
  const activeCount = Number(
    (db.prepare(`SELECT COUNT(*) AS c FROM products WHERE tracking_status = 'active'`).get() as {
      c: number;
    }).c
  );
  const pausedCount = Number(
    (db.prepare(`SELECT COUNT(*) AS c FROM products WHERE tracking_status = 'paused'`).get() as {
      c: number;
    }).c
  );
  const batchRaw = process.env.PRICE_RADAR_BATCH_SIZE?.trim();
  const batchSize = batchRaw ? Math.min(20, Math.max(1, Number(batchRaw) || 8)) : 8;
  return {
    dbConfigured: true,
    productCount,
    activeCount,
    pausedCount,
    batchSize,
  };
}

const ASIN_RE = /^[A-Z0-9]{10}$/i;

export function insertProductAdmin(input: {
  asin: string;
  url: string;
  title?: string | null;
  source?: string;
}): { id: number } {
  const asin = input.asin.trim().toUpperCase();
  if (!ASIN_RE.test(asin)) {
    throw new Error("ASIN non valido (10 caratteri alfanumerici)");
  }
  const url = input.url.trim();
  if (!url.startsWith("http")) {
    throw new Error("URL non valido");
  }
  const source = input.source?.trim() || "amazon_it";
  const db = getPriceRadarDb();
  const existing = db.prepare(`SELECT id FROM products WHERE asin = ? AND source = ?`).get(asin, source) as
    | { id: number }
    | undefined;
  if (existing) {
    throw new Error("Prodotto già presente per questo ASIN e sorgente");
  }
  const title = input.title?.trim() || null;
  const r = db
    .prepare(
      `INSERT INTO products (
        asin, source, url, canonical_url, title, currency, availability,
        tracking_status, priority_level, score, check_interval_minutes, next_check_at,
        first_tracked_at, last_seen_at
      ) VALUES (
        ?, ?, ?, ?, ?, 'EUR', 'unknown', 'active', 'cold', 0, 2880, datetime('now'),
        datetime('now'), datetime('now'), datetime('now')
      )`
    )
    .run(asin, source, url, url, title);
  const id = Number(r.lastInsertRowid);
  db.prepare(
    `INSERT INTO product_metrics (product_id, views_24h, clicks_24h, article_mentions, manual_boost, updated_at)
     VALUES (?, 0, 0, 0, 0, datetime('now'))`
  ).run(id);
  refreshProductPriorityFromMetrics(id);
  return { id };
}

export function patchProductAdmin(
  id: number,
  patch: {
    tracking_status?: "active" | "paused";
    manual_boost?: number;
    article_mentions?: number;
    check_now?: boolean;
  }
): void {
  const existing = getProductById(id);
  if (!existing) {
    throw new Error("Prodotto non trovato");
  }
  const db = getPriceRadarDb();
  db.prepare(
    `INSERT OR IGNORE INTO product_metrics (product_id, views_24h, clicks_24h, article_mentions, manual_boost, updated_at)
     VALUES (?, 0, 0, 0, 0, datetime('now'))`
  ).run(id);

  if (patch.tracking_status === "active" || patch.tracking_status === "paused") {
    db.prepare(
      `UPDATE products SET tracking_status = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(patch.tracking_status, id);
    if (patch.tracking_status === "active") {
      db.prepare(
        `UPDATE products SET consecutive_failures = 0, next_check_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
      ).run(id);
    }
  }

  if (typeof patch.manual_boost === "number" && Number.isFinite(patch.manual_boost)) {
    const v = Math.max(0, Math.min(100, Math.floor(patch.manual_boost)));
    db.prepare(`UPDATE product_metrics SET manual_boost = ?, updated_at = datetime('now') WHERE product_id = ?`).run(
      v,
      id
    );
  }

  if (typeof patch.article_mentions === "number" && Number.isFinite(patch.article_mentions)) {
    const v = Math.max(0, Math.floor(patch.article_mentions));
    db.prepare(
      `UPDATE product_metrics SET article_mentions = ?, updated_at = datetime('now') WHERE product_id = ?`
    ).run(v, id);
  }

  if (patch.check_now === true) {
    db.prepare(
      `UPDATE products SET next_check_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
    ).run(id);
  }

  refreshProductPriorityFromMetrics(id);
}
