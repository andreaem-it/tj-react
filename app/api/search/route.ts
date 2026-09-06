import { NextRequest, NextResponse } from "next/server";
import { rankResults, searchEntries, tokenize } from "@/lib/search/match";
import { articleEntries, buildLocalIndex } from "@/lib/search/sources";
import {
  SEARCH_KIND_LABEL,
  SEARCH_KIND_ORDER,
  type SearchGroup,
  type SearchResponse,
  type SearchResult,
} from "@/lib/search/types";
import { getTjApiBaseUrl } from "@/lib/config/tjApi";

/**
 * Ricerca globale (§28).
 *
 * ## Perché il punteggio sta sul server e non nel browser
 *
 * L'alternativa era spedire l'indice al client e confrontarlo lì, per risposte
 * istantanee. Si è scelto il server per tre ragioni concrete:
 *
 * 1. gli articoli richiedono comunque una richiesta di rete, quindi il viaggio
 *    di andata e ritorno è già nel percorso critico;
 * 2. l'indice contiene prodotti e prezzi che cambiano più volte al giorno, e un
 *    indice spedito al client sarebbe vecchio quanto la pagina che lo ha
 *    caricato;
 * 3. la logica di pertinenza resta in un solo posto, testabile con `node --test`
 *    invece che in un bundle da spedire a ogni lettore (§22, §51).
 *
 * La latenza percepita si governa a valle: il campo di ricerca aspetta una pausa
 * nella digitazione e ricorda le query già fatte.
 */
export const dynamic = "force-dynamic";

/**
 * La risposta è cacheabile: le stesse query tornano di continuo e il contenuto
 * cambia al ritmo delle pubblicazioni, non delle richieste.
 */
const CACHE_CONTROL = "public, s-maxage=300, stale-while-revalidate=3600";

/** Query più corta di così non seleziona nulla di utile. */
const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 120;

/** Risultati per gruppo: la tendina deve restare leggibile senza scorrere molto. */
const LIMIT_PER_KIND = 5;
/** Articoli richiesti a monte: il matcher ne scarta una parte. */
const ARTICLE_FETCH_LIMIT = 12;
/** La ricerca suggerita non deve restare appesa a un archivio esterno. */
const SEARCH_SOURCE_TIMEOUT_MS = 6_000;

/**
 * Log della query verso tj-api (§54), fire-and-forget: la ricerca deve
 * rispondere al lettore anche se tj-api è irraggiungibile o il log fallisce.
 * Nessun `await` nel percorso principale — l'errore, se c'è, va solo in log.
 */
function logSearchQueryBestEffort(query: string, resultsCount: number): void {
  const base = getTjApiBaseUrl();
  if (!base) return;
  fetch(`${base}/api/analytics/search-query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, resultsCount }),
  }).catch((e) => {
    console.error("[search] log query non riuscito (non bloccante):", e);
  });
}

function emptyResponse(query: string): NextResponse {
  return NextResponse.json({ query, groups: [] } satisfies SearchResponse, {
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}

/**
 * Restituisce un ripiego locale quando una delle fonti opzionali è lenta.
 *
 * Il timer non annulla la richiesta originaria (le API dei data layer non
 * condividono un segnale), ma libera subito la risposta HTTP: l'interfaccia
 * conserva argomenti/sezioni e indica l'assenza degli articoli anziché
 * trasformare un suggerimento di ricerca in un'attesa di decine di secondi.
 */
async function withinSearchDeadline<T>(promise: Promise<T>, fallback: T): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timeoutId = setTimeout(() => resolve(fallback), SEARCH_SOURCE_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("q") ?? "";
  const query = raw.trim();
  if (query.length > MAX_QUERY_LENGTH) {
    return NextResponse.json(
      { error: "Query troppo lunga" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (query.length < MIN_QUERY_LENGTH) return emptyResponse(query);

  const tokens = tokenize(query);
  if (tokens.length === 0) return emptyResponse(query);

  const [localIndex, articles] = await Promise.all([
    withinSearchDeadline(buildLocalIndex().catch(() => []), []),
    withinSearchDeadline(
      articleEntries(query, ARTICLE_FETCH_LIMIT),
      { entries: [], unavailable: true },
    ),
  ]);

  /**
   * Gli articoli passano dallo stesso punteggio dell'indice locale.
   *
   * La ricerca di WordPress ha ottima copertura e precisione scarsa — verificato
   * nella prima fase: la query "iOS 27" restituisce anche articoli che citano
   * "iOS" e "2027" in punti diversi. Rifiltrarli qui applica la stessa soglia
   * usata per tutto il resto, invece di mostrare due qualità diverse nella
   * stessa tendina.
   */
  const scored = [...searchEntries(tokens, localIndex), ...searchEntries(tokens, articles.entries)];

  const byKind = new Map<string, SearchResult[]>();
  for (const result of scored) {
    const bucket = byKind.get(result.kind);
    if (bucket) bucket.push(result);
    else byKind.set(result.kind, [result]);
  }

  /**
   * I gruppi si ordinano per pertinenza del proprio risultato migliore, non con
   * una sequenza fissa.
   *
   * Con l'ordine fisso la ricerca "ios 27" apriva con "Sistemi operativi",
   * elencando versioni di iOS che non erano la 27, mentre l'argomento iOS 27 —
   * la risposta — compariva terzo. Un elenco che mette per primo ciò che ha
   * l'etichetta giusta invece di ciò che risponde è esattamente il difetto che
   * rende inutile una ricerca.
   *
   * `SEARCH_KIND_ORDER` resta come spareggio: a parità di punteggio migliore, le
   * risposte specifiche precedono gli articoli.
   */
  const groups: SearchGroup[] = [];
  for (const kind of SEARCH_KIND_ORDER) {
    const results = rankResults(byKind.get(kind) ?? [], LIMIT_PER_KIND);
    if (results.length === 0) continue;
    groups.push({ kind, label: SEARCH_KIND_LABEL[kind], results });
  }

  const tieBreak = new Map(SEARCH_KIND_ORDER.map((kind, index) => [kind, index]));
  groups.sort(
    (a, b) =>
      b.results[0].score - a.results[0].score ||
      (tieBreak.get(a.kind) ?? 0) - (tieBreak.get(b.kind) ?? 0),
  );

  const body: SearchResponse = {
    query,
    groups,
    ...(articles.unavailable ? { articlesUnavailable: true } : {}),
  };

  const resultsCount = groups.reduce((sum, g) => sum + g.results.length, 0);
  logSearchQueryBestEffort(query, resultsCount);

  return NextResponse.json(body, { headers: { "Cache-Control": CACHE_CONTROL } });
}
