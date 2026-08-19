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

/** Risultati per gruppo: la tendina deve restare leggibile senza scorrere molto. */
const LIMIT_PER_KIND = 5;
/** Articoli richiesti a monte: il matcher ne scarta una parte. */
const ARTICLE_FETCH_LIMIT = 12;

function emptyResponse(query: string): NextResponse {
  return NextResponse.json({ query, groups: [] } satisfies SearchResponse, {
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("q") ?? "";
  const query = raw.trim().slice(0, 120);
  if (query.length < MIN_QUERY_LENGTH) return emptyResponse(query);

  const tokens = tokenize(query);
  if (tokens.length === 0) return emptyResponse(query);

  const [localIndex, articles] = await Promise.all([
    buildLocalIndex().catch(() => []),
    articleEntries(query, ARTICLE_FETCH_LIMIT),
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

  return NextResponse.json(body, { headers: { "Cache-Control": CACHE_CONTROL } });
}
