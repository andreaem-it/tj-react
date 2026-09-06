import { getBestCurrentDeals } from "@/lib/priceRadar/productServer";
import { composePriceDigest, MIN_PRICE_DIGEST_ITEMS, type PriceDigest } from "@/lib/newsletter/priceDigest";

/**
 * Caricamento e composizione del digest "Price Radar Weekly".
 *
 * **Modulo server-only.** `getBestCurrentDeals` è la stessa funzione dietro
 * "Le migliori occasioni" del sito: nessuna logica di selezione duplicata,
 * solo un limite più alto per avere margine prima del filtro sulla soglia
 * minima.
 */

const MAX_ITEMS = 8;
/** Shortlist più ampia della sezione home: qui non c'è altro contenuto sulla pagina che compete per spazio. */
const CANDIDATE_LIMIT = 16;

export interface LoadPriceDigestResult {
  digest: PriceDigest | null;
  /** Occasioni valide trovate, prima del taglio a `maxItems`. */
  examined: number;
}

export async function loadPriceDigest(options: { now?: number; maxItems?: number } = {}): Promise<LoadPriceDigestResult> {
  const now = options.now ?? Date.now();
  const maxItems = options.maxItems ?? MAX_ITEMS;

  const deals = await getBestCurrentDeals(CANDIDATE_LIMIT);

  const periodEnd = new Date(now);
  const periodStart = new Date(now - 7 * 24 * 3_600_000);

  return {
    digest: composePriceDigest(deals, { periodStart, periodEnd, maxItems }),
    examined: deals.length,
  };
}

export { MIN_PRICE_DIGEST_ITEMS };
