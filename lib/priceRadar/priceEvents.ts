import { getPriceRadarDb } from "./db";

const EVENT_BOOST_CAP = 20;
const EVENT_BOOST_STEP = 4;

/**
 * Dopo un aggiornamento prezzo: se calo > 5% o nuovo minimo storico (30g), aumenta priorità
 * tramite event_boost (somma allo score).
 *
 * @param prevMin30d minimo prezzo nei 30g **prima** dell’inserimento del nuovo punto nello storico.
 */
export function handlePriceEvent(
  productId: number,
  oldPrice: number | null,
  newPrice: number,
  prevMin30d: number | null
): void {
  if (!Number.isFinite(newPrice) || newPrice <= 0) return;

  let dropPct = 0;
  if (oldPrice != null && oldPrice > 0) {
    dropPct = ((oldPrice - newPrice) / oldPrice) * 100;
  }

  const newRecordLow =
    prevMin30d == null ? true : newPrice < prevMin30d - 0.009;
  const significantDrop = dropPct > 5;

  if (!significantDrop && !newRecordLow) {
    return;
  }

  const db = getPriceRadarDb();
  db.prepare(
    `INSERT OR IGNORE INTO product_metrics (product_id, views_24h, clicks_24h, article_mentions, manual_boost, event_boost, updated_at)
     VALUES (?, 0, 0, 0, 0, 0, datetime('now'))`
  ).run(productId);

  db.prepare(
    `UPDATE product_metrics SET
      event_boost = MIN(?, COALESCE(event_boost, 0) + ?),
      updated_at = datetime('now')
     WHERE product_id = ?`
  ).run(EVENT_BOOST_CAP, EVENT_BOOST_STEP, productId);
}
