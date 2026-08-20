import type { RatedProduct } from "@/lib/priceRadar/productServer";

/**
 * Digest "Price Radar Weekly" (§43-44): le occasioni reali della settimana,
 * non una vetrina di sconti nominali.
 *
 * A differenza del digest quotidiano (`digest.ts`, articoli in una finestra
 * temporale), qui non c'è una finestra da filtrare: `getBestCurrentDeals`
 * seleziona già solo i prodotti il cui prezzo è *davvero* conveniente rispetto
 * al proprio storico (price score, non sconto dichiarato), con abbastanza
 * rilevazioni da poterlo affermare. Una settimana è la cadenza di invio, non
 * un filtro sui dati: lo stesso prodotto può restare al minimo storico per
 * giorni, ed è corretto che ricompaia.
 */

export interface PriceDigest {
  kind: "price-radar-weekly";
  /** Estremi della finestra dichiarati nell'email (settimana di invio), in ISO. */
  periodStart: string;
  periodEnd: string;
  items: RatedProduct[];
}

/** Sotto questa soglia non vale spedire: vedi `MIN_DIGEST_ITEMS` in digest.ts. */
export const MIN_PRICE_DIGEST_ITEMS = 3;

/** Voci per invio: stesso tetto del digest quotidiano. */
const MAX_PRICE_DIGEST_ITEMS = 8;

export interface ComposePriceDigestOptions {
  periodStart: Date;
  periodEnd: Date;
  maxItems?: number;
}

/**
 * Compone il digest dalle occasioni già valutate e ordinate per price score.
 *
 * Restituisce `null` sotto la soglia minima, esattamente come `composeDigest`:
 * un'email con due prodotti consuma più fiducia di quanta ne costruisca.
 */
export function composePriceDigest(
  deals: readonly RatedProduct[],
  { periodStart, periodEnd, maxItems = MAX_PRICE_DIGEST_ITEMS }: ComposePriceDigestOptions,
): PriceDigest | null {
  const items = deals.slice(0, maxItems);
  if (items.length < MIN_PRICE_DIGEST_ITEMS) return null;

  return {
    kind: "price-radar-weekly",
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    items,
  };
}
