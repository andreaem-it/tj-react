import { getPriceRadarDb } from "./db";

const DEFAULT_DAYS = 30;

async function pricesInWindow(productId: number, days: number): Promise<number[]> {
  const db = await getPriceRadarDb();
  const rows = db
    .prepare(
      `SELECT price FROM price_history
       WHERE product_id = ?
         AND detected_at >= datetime('now', ?)
         AND price > 0
       ORDER BY detected_at ASC`
    )
    .all(productId, `-${days} days`) as { price: number }[];
  return rows.map((r) => Number(r.price)).filter((n) => Number.isFinite(n) && n > 0);
}

/** Prezzo minimo nel periodo (default 30g). */
export async function getMinPrice(productId: number, days: number = DEFAULT_DAYS): Promise<number | null> {
  const db = await getPriceRadarDb();
  const row = db
    .prepare(
      `SELECT MIN(price) AS m FROM price_history
       WHERE product_id = ? AND detected_at >= datetime('now', ?) AND price > 0`
    )
    .get(productId, `-${days} days`) as { m: number | null } | undefined;
  if (row?.m == null) return null;
  const n = Number(row.m);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Prezzo massimo nel periodo. */
export async function getMaxPrice(productId: number, days: number = DEFAULT_DAYS): Promise<number | null> {
  const db = await getPriceRadarDb();
  const row = db
    .prepare(
      `SELECT MAX(price) AS m FROM price_history
       WHERE product_id = ? AND detected_at >= datetime('now', ?) AND price > 0`
    )
    .get(productId, `-${days} days`) as { m: number | null } | undefined;
  if (row?.m == null) return null;
  const n = Number(row.m);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Media aritmetica dei prezzi storici nel periodo. */
export async function getAveragePrice(productId: number, days: number = DEFAULT_DAYS): Promise<number | null> {
  const db = await getPriceRadarDb();
  const row = db
    .prepare(
      `SELECT AVG(price) AS a FROM price_history
       WHERE product_id = ? AND detected_at >= datetime('now', ?) AND price > 0`
    )
    .get(productId, `-${days} days`) as { a: number | null } | undefined;
  if (row?.a == null) return null;
  const n = Number(row.a);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Volatilità normalizzata 0–1: coefficiente di variazione (dev.std / media), cap a 1.
 * Con meno di 2 punti restituisce 0 (stabile).
 */
export async function getPriceVolatility(productId: number, days: number = DEFAULT_DAYS): Promise<number> {
  const prices = await pricesInWindow(productId, days);
  if (prices.length < 2) return 0;
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  if (mean <= 0) return 0;
  const variance =
    prices.reduce((acc, p) => acc + (p - mean) * (p - mean), 0) / prices.length;
  const sd = Math.sqrt(variance);
  const cv = sd / mean;
  return Math.min(1, Math.max(0, cv));
}

/**
 * True se il prezzo corrente è almeno il 3% sotto la media 30g (o sotto il min storico nel periodo).
 */
export async function isGoodDeal(productId: number, currentPrice: number): Promise<boolean> {
  if (!Number.isFinite(currentPrice) || currentPrice <= 0) return false;
  const avg = await getAveragePrice(productId, DEFAULT_DAYS);
  const min = await getMinPrice(productId, DEFAULT_DAYS);
  if (avg != null && currentPrice <= avg * 0.97) return true;
  if (min != null && currentPrice <= min + 0.02) return true;
  return false;
}
