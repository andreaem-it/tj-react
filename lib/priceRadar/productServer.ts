import { getTjApiBaseUrl } from "@/lib/config/tjApi";
import {
  analyzePriceHistory,
  compressToChangePoints,
  findObservationGaps,
  type HistoryAnalysis,
  type HistoryRangeKey,
  type NormalizedPoint,
  type WindowStats,
} from "@/lib/priceRadar/history";
import { getPriceRating, PRICE_LEVEL_RANK, type PriceRating } from "@/lib/priceRadar/rating";
import type {
  PriceHistoryResponse,
  PriceRadarProductListItem,
  ProductRow,
} from "@/lib/priceRadar/types";

/**
 * Accesso server-side ai prodotti Price Radar e alla loro analisi.
 *
 * **Modulo server-only**: `getTjApiBaseUrl()` legge una env server-only e
 * `lib/config/tjApi` fa un check fail-fast a module-load.
 *
 * Come `lib/priceRadar/server.ts`, va diretto a tj-api invece di passare dal
 * proxy `/api/*`: far chiamare al server il proprio stesso proxy costerebbe due
 * invocazioni per lo stesso dato.
 */

const UPSTREAM_TIMEOUT_MS = 6000;
const TJ_API_USER_AGENT = "TechJournal-Frontend/1.0 (+https://www.techjournal.it)";

/**
 * TTL dei dati prodotto.
 *
 * Più lungo dei 300s della lista: la pagina di dettaglio mostra uno storico che
 * si muove al ritmo del tracker (`check_interval_minutes` è dell'ordine delle
 * ore), quindi rigenerarla ogni cinque minuti costerebbe richieste senza
 * cambiare ciò che si vede.
 */
export const PRODUCT_REVALIDATE_SECONDS = 1800;

async function getJson<T>(url: string, revalidate: number): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": TJ_API_USER_AGENT },
      next: { revalidate },
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

/** Elenco completo dei prodotti monitorati. */
export async function loadProductList(): Promise<PriceRadarProductListItem[]> {
  const base = getTjApiBaseUrl();
  if (!base) return [];
  const data = await getJson<{ products?: PriceRadarProductListItem[] }>(
    `${base}/api/price-radar/products?status=active`,
    PRODUCT_REVALIDATE_SECONDS,
  );
  return Array.isArray(data?.products) ? data.products : [];
}

/**
 * Risolve un ASIN nel prodotto corrispondente.
 *
 * tj-api espone il dettaglio solo per id numerico — `/products/B0CW4HD359`
 * risponde 400 — quindi l'ASIN si risolve sull'elenco. L'elenco è una singola
 * richiesta condivisa fra tutte le pagine prodotto e con la stessa Data Cache
 * della pagina indice, non una richiesta per prodotto.
 */
export async function resolveProductIdByAsin(asin: string): Promise<number | null> {
  const normalized = asin.trim().toUpperCase();
  if (!normalized) return null;
  const products = await loadProductList();
  const match = products.find((p) => p.asin?.toUpperCase() === normalized);
  return match?.id ?? null;
}

/** Dettaglio completo del prodotto. */
export async function loadProductById(id: number): Promise<ProductRow | null> {
  const base = getTjApiBaseUrl();
  if (!base) return null;
  const data = await getJson<{ product?: ProductRow }>(
    `${base}/api/price-radar/products/${id}`,
    PRODUCT_REVALIDATE_SECONDS,
  );
  return data?.product ?? null;
}

/**
 * Storico completo del prodotto.
 *
 * Si richiede sempre `range=max` e le finestre si ricavano da lì: sono cinque
 * periodi calcolati da un'unica risposta invece di cinque richieste, e soprattutto
 * garantisce che 7, 30 e 90 giorni siano calcolati con lo stesso metodo. Con
 * richieste separate le medie arriverebbero dall'upstream, che le calcola per
 * campione (vedi `lib/priceRadar/history`).
 */
export async function loadPriceHistory(id: number): Promise<PriceHistoryResponse | null> {
  const base = getTjApiBaseUrl();
  if (!base) return null;
  return getJson<PriceHistoryResponse>(
    `${base}/api/price-radar/products/${id}/history?range=max`,
    PRODUCT_REVALIDATE_SECONDS,
  );
}

/** Serie ridotta ai punti da disegnare, con i buchi dichiarati. */
export interface ChartSeries {
  points: NormalizedPoint[];
  gaps: Array<{ from: number; to: number }>;
}

export interface ProductAnalysis {
  analysis: HistoryAnalysis;
  /** Finestra su cui si esprime la valutazione principale. */
  ratingWindow: HistoryRangeKey;
  stats: WindowStats;
  rating: PriceRating;
  /** Serie compressa per il grafico, per ciascuna finestra con dati. */
  series: Partial<Record<HistoryRangeKey, ChartSeries>>;
  /** Finestre che hanno almeno due rilevazioni, quindi disegnabili. */
  availableRanges: HistoryRangeKey[];
}

/**
 * Finestra preferita per la valutazione.
 *
 * Novanta giorni è il compromesso abituale nel confronto prezzi: abbastanza
 * lungo da contenere un ciclo di promozioni, abbastanza corto da non far pesare
 * un listino di un anno fa su un prodotto che nel frattempo è invecchiato. Se a
 * 90 giorni non ci sono rilevazioni si ripiega sull'intero storico, che per un
 * prodotto appena inserito è comunque tutto ciò che esiste.
 */
const PREFERRED_RATING_WINDOW: HistoryRangeKey = "90d";

/** Punti minimi perché una finestra abbia una curva da disegnare. */
const MIN_POINTS_FOR_CHART = 2;

export function analyzeProduct(
  currentPrice: number | null,
  history: PriceHistoryResponse | null,
  now: number,
): ProductAnalysis {
  const analysis = analyzePriceHistory(history?.points ?? [], { now });

  const ratingWindow: HistoryRangeKey =
    analysis.windows[PREFERRED_RATING_WINDOW].observationCount > 0
      ? PREFERRED_RATING_WINDOW
      : "all";
  const stats = analysis.windows[ratingWindow];
  const rating = getPriceRating({ currentPrice, stats });

  const series: Partial<Record<HistoryRangeKey, ChartSeries>> = {};
  const availableRanges: HistoryRangeKey[] = [];
  for (const [key, windowStats] of Object.entries(analysis.windows) as Array<
    [HistoryRangeKey, WindowStats]
  >) {
    if (windowStats.observationCount < MIN_POINTS_FOR_CHART) continue;
    const windowStart =
      windowStats.windowDays === null
        ? Number.NEGATIVE_INFINITY
        : now - windowStats.windowDays * 24 * 60 * 60 * 1000;
    const inWindow = analysis.points.filter((p) => p.t >= windowStart && p.t <= now);
    series[key] = {
      points: compressToChangePoints(inWindow),
      gaps: findObservationGaps(inWindow),
    };
    availableRanges.push(key);
  }

  return { analysis, ratingWindow, stats, rating, series, availableRanges };
}

/** Prodotto con la sua valutazione, pronto per card e classifiche. */
export interface RatedProduct {
  product: PriceRadarProductListItem;
  stats: WindowStats;
  rating: PriceRating;
}

/**
 * Quanti candidati vengono valutati davvero prima di comporre la classifica.
 *
 * Valutare tutto il catalogo significherebbe una richiesta di storico per
 * prodotto — 94 oggi, in crescita — a ogni rigenerazione. Si pre-seleziona
 * quindi per sconto nominale, che è un filtro *grossolano ma inclusivo*: un
 * prodotto senza alcuno sconto dichiarato non può risultare al minimo storico,
 * quindi non c'è nulla da perdere a escluderlo dalla verifica.
 *
 * Il punto è che lo sconto nominale seleziona i candidati e **non** decide la
 * classifica: l'ordine finale viene dal price score calcolato sullo storico
 * reale. Sul catalogo attuale i due criteri divergono nettamente — id 60 ha il
 * 36% di sconto dichiarato ma quattro rilevazioni in quattro giorni, quindi non
 * entra in classifica.
 */
const DEALS_SHORTLIST_SIZE = 24;

/** Richieste di storico avviate in parallelo nelle scansioni sull'intero catalogo. */
const CATALOG_SCAN_CONCURRENCY = 8;

/**
 * ASIN delle sole pagine prodotto che vanno in indice.
 *
 * Applica lo stesso criterio di `generateMetadata` della pagina prodotto — una
 * pagina che non può ancora dire se il prezzo è conveniente resta `noindex` —
 * così la sitemap non dichiara URL che poi si escludono da soli. Dichiarare in
 * sitemap una pagina servita con `noindex` è una contraddizione di segnali che
 * spende crawl budget senza risultato.
 *
 * Costa una richiesta di storico per prodotto, ma sono le stesse che servono le
 * pagine prodotto e passano dalla loro Data Cache: la sitemap è a sua volta
 * dietro `s-maxage=3600`, quindi la scansione gira al più una volta l'ora.
 */
export async function getIndexableProductAsins(): Promise<Set<string>> {
  const products = await loadProductList();
  const indexable = new Set<string>();
  const now = Date.now();

  for (let i = 0; i < products.length; i += CATALOG_SCAN_CONCURRENCY) {
    const batch = products.slice(i, i + CATALOG_SCAN_CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (product) => {
        if (!product.asin || product.asin.length < 5) return null;
        // Senza titolo la pagina si intitola "Prodotto B0XXXXXXXX" e non può
        // rispondere a nessuna ricerca. Sul catalogo attuale 51 prodotti su 94
        // arrivano senza titolo dall'ingestion — e sono esattamente gli stessi
        // che non hanno ancora storico, perché appena inseriti — quindi oggi la
        // condizione non esclude nulla di nuovo. Resta perché i due difetti
        // possono presentarsi separati.
        if (!product.title?.trim()) return null;
        const history = await loadPriceHistory(product.id).catch(() => null);
        const { rating } = analyzeProduct(product.current_price, history, now);
        return rating.confidence === "insufficient" ? null : product.asin;
      }),
    );
    for (const asin of results) {
      if (asin) indexable.add(asin);
    }
  }

  return indexable;
}

/**
 * Le migliori occasioni del momento, ordinate per price score (§29).
 *
 * Non è "i prodotti con lo sconto più alto": entrano solo i prodotti il cui
 * prezzo risulta effettivamente conveniente rispetto al proprio storico, con
 * abbastanza rilevazioni da poterlo affermare.
 *
 * Può legittimamente restituire un elenco vuoto — ed è ciò che fa oggi su gran
 * parte del catalogo. Chi la usa deve gestirlo senza mostrare una sezione vuota.
 */
export async function getBestCurrentDeals(limit = 6): Promise<RatedProduct[]> {
  const products = await loadProductList();
  if (products.length === 0) return [];

  const shortlist = products
    .filter((p) => p.current_price != null && p.current_price > 0 && p.title?.trim())
    .sort((a, b) => (b.discount_percent ?? 0) - (a.discount_percent ?? 0))
    .slice(0, DEALS_SHORTLIST_SIZE);

  const now = Date.now();
  const rated = await Promise.all(
    shortlist.map(async (product) => {
      const history = await loadPriceHistory(product.id);
      const { stats, rating } = analyzeProduct(product.current_price, history, now);
      return { product, stats, rating };
    }),
  );

  return rated
    .filter(
      (entry) =>
        entry.rating.level != null &&
        entry.rating.confidence !== "insufficient" &&
        PRICE_LEVEL_RANK[entry.rating.level] <= PRICE_LEVEL_RANK.good,
    )
    .sort((a, b) => {
      const rankDelta = PRICE_LEVEL_RANK[a.rating.level!] - PRICE_LEVEL_RANK[b.rating.level!];
      if (rankDelta !== 0) return rankDelta;
      // A parità di livello vince chi si allontana di più dalla propria media:
      // è il risparmio reale rispetto a quanto quel prodotto costa di solito.
      return (b.rating.discountVsAverage ?? 0) - (a.rating.discountVsAverage ?? 0);
    })
    .slice(0, limit);
}
