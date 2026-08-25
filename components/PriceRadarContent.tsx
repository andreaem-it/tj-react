"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import type { TechRadarOffer, SortOption } from "@/lib/techradar";
import {
  TECHRADAR_API_BASE,
  PRICE_RADAR_ENABLED,
  PRICE_RADAR_BETA_ENABLED,
  PRICE_RADAR_SQLITE_ENABLED,
} from "@/lib/techradar";
import { API_REQUEST_HEADERS, logApiUrl } from "@/lib/constants";
import { fetchPriceRadarFilters, fetchPriceRadarProducts } from "@/lib/tjApiClient";
import {
  isDisplayableOffer,
  mapProductsToOffers,
  sortOffers,
  type PriceRadarInitialData,
} from "@/lib/priceRadar/offers";
import PriceRadarCard from "./PriceRadarCard";
import { getBetaOffers } from "@/lib/priceRadarBetaData";
import ProductSuggestionForm from "@/components/priceRadar/ProductSuggestionForm";

const TECHRADAR_OFFERS_URL = `${TECHRADAR_API_BASE}/offers.php`;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minuti

interface CachedData {
  offers: TechRadarOffer[];
  fetchedAt: number;
  cacheKey: string;
}

let memoryCache: CachedData | null = null;

function offersCacheKey(params: {
  search: string;
  sort: SortOption;
  brand: string;
  category: string;
}): string {
  return [params.search, params.sort, params.brand, params.category].join("|");
}

async function fetchLiveOffers(): Promise<TechRadarOffer[]> {
  if (memoryCache && Date.now() - memoryCache.fetchedAt < CACHE_TTL_MS) {
    return memoryCache.offers;
  }
  logApiUrl(TECHRADAR_OFFERS_URL);
  const res = await fetch(TECHRADAR_OFFERS_URL, { headers: API_REQUEST_HEADERS });
  if (!res.ok) throw new Error("Errore nel caricamento delle offerte live");
  const data = await res.json();
  const offers = Array.isArray(data) ? data : [];
  memoryCache = { offers, fetchedAt: Date.now(), cacheKey: "legacy-live" };
  return offers;
}

async function fetchBetaOffers(): Promise<TechRadarOffer[]> {
  // Dataset statico in memoria: nessuna chiamata di rete.
  if (memoryCache && Date.now() - memoryCache.fetchedAt < CACHE_TTL_MS) {
    return memoryCache.offers;
  }
  const offers = getBetaOffers();
  memoryCache = { offers, fetchedAt: Date.now(), cacheKey: "beta" };
  return offers;
}

async function fetchSqliteOffers(params: {
  search: string;
  sort: SortOption;
  brand: string;
  category: string;
}): Promise<TechRadarOffer[]> {
  const cacheKey = offersCacheKey(params);
  if (
    memoryCache &&
    memoryCache.cacheKey === cacheKey &&
    Date.now() - memoryCache.fetchedAt < CACHE_TTL_MS
  ) {
    return memoryCache.offers;
  }
  const data = await fetchPriceRadarProducts({
    search: params.search || undefined,
    sort: params.sort,
    brand: params.brand || undefined,
    category: params.category || undefined,
    status: "active",
    discountOnly: true,
  });
  const products = Array.isArray(data.products) ? data.products : [];
  const offers = mapProductsToOffers(products);
  memoryCache = { offers, fetchedAt: Date.now(), cacheKey };
  return offers;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "discount", label: "Sconto maggiore" },
  { value: "newest", label: "Più recenti" },
  { value: "price", label: "Prezzo più basso" },
];

function PriceRadarComingSoon() {
  return (
    <div className="max-w-7xl mx-auto px-0 md:px-4 py-10">
      <header className="mb-10">
        <h1 className="text-foreground text-3xl md:text-4xl font-bold mb-2">Price Radar</h1>
        <p className="text-muted text-lg mb-8">
          Monitoraggio automatico dei prezzi su Amazon per tecnologia, gaming e domotica.
        </p>
      </header>
      <div className="bg-content-bg rounded-xl border border-border border-dashed p-16 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-accent/20 text-accent mb-6">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-foreground text-2xl font-bold mb-2">Coming Soon</h2>
        <p className="text-muted max-w-md mx-auto">
          Stiamo preparando il monitoraggio prezzi in tempo reale. La sezione sarà attiva non appena
          l&apos;integrazione con Amazon sarà completata.
        </p>
      </div>
    </div>
  );
}

export default function PriceRadarContent({
  initialData,
  /**
   * Blocco renderizzato subito sotto l'intestazione.
   *
   * Arriva come `children` e non come import perché è un Server Component che
   * carica i propri dati: passarlo dall'esterno lo lascia sul server, mentre
   * importarlo qui lo trascinerebbe nel bundle del browser. È anche l'unico modo
   * di collocarlo *dopo* l'H1 senza spezzare la gerarchia dei titoli — messo
   * come fratello della pagina finirebbe prima, e per giunta affiancato, dato
   * che in `AppShell` i children stanno in un contenitore flex.
   */
  headerSlot,
}: {
  initialData: PriceRadarInitialData;
  headerSlot?: React.ReactNode;
}) {
  const [offers, setOffers] = useState<TechRadarOffer[]>(initialData.offers);
  // I dati arrivano già renderizzati dal server: partire da `true` rimetterebbe
  // lo skeleton al posto del contenuto al primo paint. Si parte in caricamento
  // solo quando il fetch server-side è fallito e il client deve ritentare,
  // altrimenti si vedrebbe un lampo di "Nessuna offerta".
  const [loading, setLoading] = useState(initialData.failed);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sort, setSort] = useState<SortOption>("discount");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [brands, setBrands] = useState<string[]>(initialData.brands);
  const [categories, setCategories] = useState<string[]>(initialData.categories);
  const loadRequestId = useRef(0);

  /**
   * Il primo giro dell'effetto corrisponde ai filtri di default, che il server
   * ha già risolto: si salta il refetch, a meno che il fetch server-side non
   * sia fallito. Senza questa guardia ogni visita rifarebbe subito la stessa
   * chiamata appena idratata.
   */
  const skipInitialLoad = useRef(!initialData.failed);

  const loadOffers = useCallback(async () => {
    const requestId = ++loadRequestId.current;
    setLoading(true);
    setError(null);
    try {
      const data = PRICE_RADAR_SQLITE_ENABLED
        ? await fetchSqliteOffers({ search, sort, brand, category })
        : PRICE_RADAR_ENABLED
          ? await fetchLiveOffers()
          : await fetchBetaOffers();
      if (requestId !== loadRequestId.current) return;
      setOffers(data);
    } catch (e) {
      if (requestId !== loadRequestId.current) return;
      setError(e instanceof Error ? e.message : "Errore nel caricamento");
      setOffers([]);
    } finally {
      if (requestId === loadRequestId.current) setLoading(false);
    }
  }, [search, sort, brand, category]);

  // Filtri già serviti dal server: nessuna chiamata da rifare al mount.
  const hasServerFilters =
    initialData.brands.length > 0 || initialData.categories.length > 0;

  useEffect(() => {
    if (!PRICE_RADAR_SQLITE_ENABLED) return;
    if (hasServerFilters) return;
    let cancelled = false;
    void fetchPriceRadarFilters()
      .then((data) => {
        if (cancelled) return;
        setBrands(Array.isArray(data.brands) ? data.brands : []);
        setCategories(Array.isArray(data.categories) ? data.categories : []);
      })
      .catch(() => {
        if (!cancelled) {
          setBrands([]);
          setCategories([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [hasServerFilters]);

  useEffect(() => {
    if (!PRICE_RADAR_ENABLED && !PRICE_RADAR_BETA_ENABLED && !PRICE_RADAR_SQLITE_ENABLED) {
      return;
    }
    // Primo giro con i filtri di default: il server ha già fornito il risultato.
    if (skipInitialLoad.current) {
      skipInitialLoad.current = false;
      return;
    }
    void loadOffers();
    return () => {
      // Invalida la risposta in volo quando cambiano i filtri o il componente
      // viene smontato: solo l'ultima richiesta può aggiornare la UI.
      loadRequestId.current += 1;
    };
  }, [loadOffers]);

  const filteredAndSorted = useMemo(() => {
    const displayableOffers = offers.filter(isDisplayableOffer);
    if (PRICE_RADAR_SQLITE_ENABLED) {
      return displayableOffers;
    }
    let result = displayableOffers;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (o) =>
          o.title.toLowerCase().includes(q) ||
          o.asin.toLowerCase().includes(q)
      );
    }
    return sortOffers(result, sort);
  }, [offers, search, sort]);

  if (!PRICE_RADAR_ENABLED && !PRICE_RADAR_BETA_ENABLED && !PRICE_RADAR_SQLITE_ENABLED) {
    return <PriceRadarComingSoon />;
  }

  if (loading && offers.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-0 md:px-4 py-10">
        <div className="mb-8 animate-pulse">
          <div className="h-10 w-64 bg-content-bg rounded mb-2" />
          <div className="h-5 w-96 bg-content-bg/60 rounded" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-content-bg rounded-xl overflow-hidden border border-border">
              <div className="aspect-square bg-sidebar-bg" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-sidebar-bg rounded w-3/4" />
                <div className="h-4 bg-sidebar-bg rounded w-1/2" />
                <div className="h-10 bg-sidebar-bg rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error && offers.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-0 md:px-4 py-10">
        <div className="text-center py-16">
          <p className="text-muted text-lg mb-4">{error}</p>
          <button
            type="button"
            onClick={loadOffers}
            className="min-h-11 px-6 py-3 bg-accent hover:bg-accent/90 text-foreground font-semibold rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Riprova
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-0 md:px-4 py-10">
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-foreground text-3xl md:text-4xl font-bold">Price Radar</h1>
          {PRICE_RADAR_SQLITE_ENABLED && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/35">
              Live API
            </span>
          )}
          {PRICE_RADAR_ENABLED && !PRICE_RADAR_SQLITE_ENABLED && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/35">
              Legacy Feed
            </span>
          )}
          {PRICE_RADAR_BETA_ENABLED && !PRICE_RADAR_ENABLED && !PRICE_RADAR_SQLITE_ENABLED && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-accent/15 text-accent border border-accent/40">
              Beta
            </span>
          )}
        </div>
        <p className="text-muted text-lg">
          Offerte selezionate di prodotti tech su Amazon, aggiornate periodicamente.
        </p>
      </header>

      <div className="mb-10">
        <ProductSuggestionForm />
      </div>

      {headerSlot && <div className="mb-10">{headerSlot}</div>}

      {/* Barra filtri */}
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              placeholder="Cerca prodotti..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setSearch(searchInput);
              }}
              className="w-full pl-10 pr-4 py-3 bg-content-bg border border-border rounded-lg text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
              aria-label="Cerca prodotti"
            />
          </div>
          <button
            type="button"
            onClick={() => setSearch(searchInput)}
            className="min-h-11 px-4 py-3 bg-content-bg border border-border rounded-lg text-foreground hover:bg-sidebar-bg transition-colors sm:self-stretch focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Cerca
          </button>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
          {PRICE_RADAR_SQLITE_ENABLED && brands.length > 0 && (
            <label className="flex flex-col gap-1 text-sm min-w-[160px]">
              <span className="text-muted">Marchio</span>
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="px-4 py-3 bg-content-bg border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
              >
                <option value="">Tutti i marchi</option>
                {brands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </label>
          )}
          {PRICE_RADAR_SQLITE_ENABLED && categories.length > 0 && (
            <label className="flex flex-col gap-1 text-sm min-w-[160px]">
              <span className="text-muted">Categoria</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="px-4 py-3 bg-content-bg border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
              >
                <option value="">Tutte le categorie</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="flex flex-col gap-1 text-sm min-w-[160px]">
            <span className="text-muted">Ordina</span>
            <select
              id="sort-select"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="px-4 py-3 bg-content-bg border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Griglia prodotti */}
      {filteredAndSorted.length === 0 ? (
        <p className="text-muted text-center py-16">
          {search.trim() || brand || category
            ? "Nessun prodotto in sconto trovato con i filtri selezionati."
            : "Nessuna offerta in sconto al momento."}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredAndSorted.map((offer) => (
            <PriceRadarCard key={offer.asin} offer={offer} />
          ))}
        </div>
      )}
    </div>
  );
}
