import { getTjApiBaseUrl } from "@/lib/config/tjApi";
import { tjApiServerHeaders } from "@/lib/tjApiServerHeaders";
import {
  isDisplayableOffer,
  mapProductsToOffers,
  type PriceRadarInitialData,
} from "@/lib/priceRadar/offers";
import type { PriceRadarProductListItem } from "@/lib/priceRadar/types";
import { getBetaOffers } from "@/lib/priceRadarBetaData";
import {
  PRICE_RADAR_BETA_ENABLED,
  PRICE_RADAR_ENABLED,
  PRICE_RADAR_SQLITE_ENABLED,
  TECHRADAR_API_BASE,
  type TechRadarOffer,
} from "@/lib/techradar";

/**
 * Caricamento server-side dei dati iniziali di `/price-radar`.
 *
 * Da non usare in un componente client: `getTjApiBaseUrl()` legge
 * `TJ_API_BASE_URL`, che è server-only, e `lib/config/tjApi` fa un check
 * fail-fast a module-load.
 *
 * Non passa da `lib/tjApiClient`: lì `resolvePublicApiUrl()` restituisce un
 * path **relativo** (`/api/...`) quando `NEXT_PUBLIC_TJ_API_BASE_URL` non è
 * configurata — su Node `fetch("/api/...")` lancia, e in più significherebbe
 * far chiamare al server il proprio stesso proxy (due function invocation per
 * lo stesso dato). Qui si va diretti a tj-api.
 */

const UPSTREAM_TIMEOUT_MS = 6000;
/** Stesso UA delle chiamate server-to-server del proxy (vedi `lib/tjApiProxy`). */

/** Allineato al TTL della cache in memoria del componente client. */
export const PRICE_RADAR_REVALIDATE_SECONDS = 300;

export type { PriceRadarInitialData };

const EMPTY: PriceRadarInitialData = {
  offers: [],
  brands: [],
  categories: [],
  failed: false,
};

async function getJson<T>(url: string): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: tjApiServerHeaders(),
      next: { revalidate: PRICE_RADAR_REVALIDATE_SECONDS },
      signal: controller.signal,
    });
    if (!res.ok) {
      console.error(`[PriceRadar] upstream ${res.status} su ${url}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (e) {
    console.error(`[PriceRadar] fetch fallito su ${url}:`, e);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Modalità corrente: gli stessi flag valutati dal componente client. */
async function loadFromTjApi(): Promise<PriceRadarInitialData> {
  const base = getTjApiBaseUrl();
  if (!base) {
    // In dev senza TJ_API_BASE_URL il check è solo un warning: si lascia
    // ritentare il client, che passa dal proxy.
    return { ...EMPTY, failed: true };
  }

  // I parametri corrispondono allo stato iniziale del componente client
  // (nessuna ricerca, nessun filtro, ordinamento per sconto): l'HTML servito
  // combacia con ciò che il client renderizza dopo l'idratazione.
  const productsUrl = `${base}/api/price-radar/products?status=active&discountOnly=1&sort=discount`;
  const filtersUrl = `${base}/api/price-radar/filters`;

  const [productsJson, filtersJson] = await Promise.all([
    getJson<{ products?: PriceRadarProductListItem[] }>(productsUrl),
    getJson<{ brands?: string[]; categories?: string[] }>(filtersUrl),
  ]);

  if (!productsJson) {
    return { ...EMPTY, failed: true };
  }

  return {
    offers: mapProductsToOffers(
      Array.isArray(productsJson.products) ? productsJson.products : [],
    ),
    brands: Array.isArray(filtersJson?.brands) ? filtersJson.brands : [],
    categories: Array.isArray(filtersJson?.categories) ? filtersJson.categories : [],
    failed: false,
  };
}

async function loadFromLegacyFeed(): Promise<PriceRadarInitialData> {
  const data = await getJson<TechRadarOffer[]>(`${TECHRADAR_API_BASE}/offers.php`);
  if (!data) return { ...EMPTY, failed: true };
  const offers = Array.isArray(data) ? data : [];
  return { ...EMPTY, offers: offers.filter(isDisplayableOffer) };
}

export async function loadInitialPriceRadarData(): Promise<PriceRadarInitialData> {
  if (PRICE_RADAR_SQLITE_ENABLED) return loadFromTjApi();
  if (PRICE_RADAR_ENABLED) return loadFromLegacyFeed();
  if (PRICE_RADAR_BETA_ENABLED) {
    // Dataset statico in bundle: nessuna rete, nessun fallimento possibile.
    return { ...EMPTY, offers: getBetaOffers().filter(isDisplayableOffer) };
  }
  // Nessun flag attivo: la pagina rende "Coming Soon", che non usa questi dati.
  return EMPTY;
}
