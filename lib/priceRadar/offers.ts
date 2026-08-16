import type { PriceRadarProductListItem } from "@/lib/priceRadar/types";
import type { SortOption, TechRadarOffer } from "@/lib/techradar";

/**
 * Logica di presentazione delle offerte, condivisa fra il render server della
 * pagina `/price-radar` e il refetch client sui filtri.
 *
 * Vive fuori da `PriceRadarContent` perché quel componente è `"use client"`:
 * importarlo da un Server Component per riusare mapping e filtri trascinerebbe
 * l'intero componente (e i suoi hook) nel grafo server.
 */

/** Sotto questa soglia lo sconto non è abbastanza rilevante da mostrare. */
export const MIN_DISPLAY_DISCOUNT_PERCENT = 3;

/**
 * Dati calcolati sul server e passati al componente client come stato iniziale.
 *
 * Dichiarata qui e non in `lib/priceRadar/server` perché la importa anche il
 * componente client: `server.ts` importa `lib/config/tjApi`, che a module-load
 * fa un check fail-fast su una env server-only.
 */
export interface PriceRadarInitialData {
  offers: TechRadarOffer[];
  brands: string[];
  categories: string[];
  /**
   * Il fetch server-side non è riuscito: il client ritenta al mount invece di
   * mostrare una griglia vuota che sembrerebbe "nessuna offerta".
   */
  failed: boolean;
}

/** Segnaposto generato dal tracker quando lo scrape del titolo non è ancora arrivato. */
const PLACEHOLDER_TITLE = /^Prodotto\s+[A-Z0-9]{10}$/i;

export function isDisplayableOffer(offer: TechRadarOffer): boolean {
  const title = offer.title.trim();
  return (
    title.length > 0 &&
    !PLACEHOLDER_TITLE.test(title) &&
    offer.image.trim().length > 0 &&
    Number.isFinite(offer.price) &&
    offer.price > 0 &&
    Number.isFinite(offer.previous_avg_price) &&
    offer.previous_avg_price > offer.price &&
    Number.isFinite(offer.discount_percent) &&
    offer.discount_percent >= MIN_DISPLAY_DISCOUNT_PERCENT
  );
}

/** Righe prodotto di tj-api → offerte renderizzabili. */
export function mapProductsToOffers(products: PriceRadarProductListItem[]): TechRadarOffer[] {
  return products
    .filter((p) => {
      const title = p.title?.trim() ?? "";
      const image = p.image_url?.trim() ?? "";
      return (
        title.length > 0 &&
        !PLACEHOLDER_TITLE.test(title) &&
        image.length > 0 &&
        p.current_price != null &&
        p.current_price > 0 &&
        p.max_price_30d != null &&
        p.max_price_30d > p.current_price &&
        p.discount_percent >= MIN_DISPLAY_DISCOUNT_PERCENT
      );
    })
    .map((p) => ({
      title: p.title!.trim(),
      price: p.current_price!,
      previous_avg_price: p.max_price_30d!,
      discount_percent: p.discount_percent,
      image: p.image_url!.trim(),
      url: p.url,
      asin: p.asin,
      // `last_checked_at` è sempre valorizzato da tj-api; la stringa vuota è
      // l'ultima spiaggia e ordina in fondo su "newest" invece di produrre un
      // timestamp diverso fra render server e client.
      created_at: p.last_price_change_at ?? p.last_checked_at ?? "",
      productId: p.id,
    }));
}

/**
 * Un `created_at` assente o malformato darebbe NaN nel comparatore, e un
 * comparatore che restituisce NaN produce un ordinamento indefinito per
 * *tutto* l'array, non solo per l'elemento rotto. Si degrada a epoch, che su
 * "newest" (discendente) finisce in fondo.
 */
function offerTimestamp(offer: TechRadarOffer): number {
  const t = new Date(offer.created_at).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export function sortOffers(offers: TechRadarOffer[], sort: SortOption): TechRadarOffer[] {
  const copy = [...offers];
  switch (sort) {
    case "discount":
      return copy.sort((a, b) => b.discount_percent - a.discount_percent);
    case "newest":
      return copy.sort((a, b) => offerTimestamp(b) - offerTimestamp(a));
    case "price":
      return copy.sort((a, b) => a.price - b.price);
    default:
      return copy;
  }
}
