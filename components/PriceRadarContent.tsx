"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import type { TechRadarOffer, SortOption } from "@/lib/techradar";
import { TECHRADAR_API_BASE, PRICE_RADAR_ENABLED, PRICE_RADAR_BETA_ENABLED } from "@/lib/techradar";
import { API_REQUEST_HEADERS, logApiUrl } from "@/lib/constants";
import PriceRadarCard from "./PriceRadarCard";
import { getBetaOffers } from "@/lib/priceRadarBetaData";

const TECHRADAR_OFFERS_URL = `${TECHRADAR_API_BASE}/offers.php`;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minuti

interface CachedData {
  offers: TechRadarOffer[];
  fetchedAt: number;
}

let memoryCache: CachedData | null = null;

async function fetchLiveOffers(): Promise<TechRadarOffer[]> {
  if (memoryCache && Date.now() - memoryCache.fetchedAt < CACHE_TTL_MS) {
    return memoryCache.offers;
  }
  logApiUrl(TECHRADAR_OFFERS_URL);
  const res = await fetch(TECHRADAR_OFFERS_URL, { headers: API_REQUEST_HEADERS });
  if (!res.ok) throw new Error("Errore nel caricamento delle offerte live");
  const data = await res.json();
  const offers = Array.isArray(data) ? data : [];
  memoryCache = { offers, fetchedAt: Date.now() };
  return offers;
}

async function fetchBetaOffers(): Promise<TechRadarOffer[]> {
  // Dataset statico in memoria: nessuna chiamata di rete.
  if (memoryCache && Date.now() - memoryCache.fetchedAt < CACHE_TTL_MS) {
    return memoryCache.offers;
  }
  const offers = getBetaOffers();
  memoryCache = { offers, fetchedAt: Date.now() };
  return offers;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "discount", label: "Sconto maggiore" },
  { value: "newest", label: "Più recenti" },
  { value: "price", label: "Prezzo più basso" },
];

function sortOffers(offers: TechRadarOffer[], sort: SortOption): TechRadarOffer[] {
  const copy = [...offers];
  switch (sort) {
    case "discount":
      return copy.sort((a, b) => b.discount_percent - a.discount_percent);
    case "newest":
      return copy.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    case "price":
      return copy.sort((a, b) => a.price - b.price);
    default:
      return copy;
  }
}

function PriceRadarComingSoon() {
  return (
    <div className="max-w-7xl mx-auto px-2.5 md:px-4 py-10">
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

export default function PriceRadarContent() {
  const [offers, setOffers] = useState<TechRadarOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("discount");

  const loadOffers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = PRICE_RADAR_ENABLED ? await fetchLiveOffers() : await fetchBetaOffers();
      setOffers(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore nel caricamento");
      setOffers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (PRICE_RADAR_ENABLED || PRICE_RADAR_BETA_ENABLED) {
      loadOffers();
    } else {
      setLoading(false);
    }
  }, [loadOffers]);

  const filteredAndSorted = useMemo(() => {
    let result = offers;
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

  if (!PRICE_RADAR_ENABLED && !PRICE_RADAR_BETA_ENABLED) {
    return <PriceRadarComingSoon />;
  }

  if (loading && offers.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-2.5 md:px-4 py-10">
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
      <div className="max-w-7xl mx-auto px-2.5 md:px-4 py-10">
        <div className="text-center py-16">
          <p className="text-muted text-lg mb-4">{error}</p>
          <button
            type="button"
            onClick={loadOffers}
            className="px-6 py-3 bg-accent hover:bg-accent/90 text-foreground font-semibold rounded-lg transition-colors"
          >
            Riprova
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-2.5 md:px-4 py-10">
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-foreground text-3xl md:text-4xl font-bold">Price Radar</h1>
          {PRICE_RADAR_BETA_ENABLED && !PRICE_RADAR_ENABLED && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-accent/15 text-accent border border-accent/40">
              Beta
            </span>
          )}
        </div>
        <p className="text-muted text-lg">
          Monitoraggio automatico dei prezzi su Amazon per tecnologia, gaming e domotica.
        </p>
        {PRICE_RADAR_BETA_ENABLED && !PRICE_RADAR_ENABLED && (
          <p className="text-muted text-sm mt-2">
            Versione beta con dataset statico interno. L&apos;integrazione completa con Amazon PA-API
            sarà attivata appena disponibile.
          </p>
        )}
      </header>

      {/* Barra filtri */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
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
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-content-bg border border-border rounded-lg text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
            aria-label="Cerca prodotti"
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="sort-select" className="text-muted text-sm whitespace-nowrap">
            Ordina:
          </label>
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
        </div>
      </div>

      {/* Griglia prodotti */}
      {filteredAndSorted.length === 0 ? (
        <p className="text-muted text-center py-16">
          {search.trim() ? "Nessun prodotto trovato per la ricerca." : "Nessuna offerta al momento."}
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
