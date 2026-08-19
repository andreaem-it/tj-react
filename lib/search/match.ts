import { slugify } from "@/lib/content/text";
import type { SearchEntry, SearchResult, SearchResultKind } from "@/lib/search/types";

/**
 * Punteggio di pertinenza della ricerca globale.
 *
 * Modulo puro e deterministico, senza I/O: gira sul server dentro la route di
 * ricerca ed è testabile senza rete.
 *
 * ## Perché non si richiede che tutti i token combacino
 *
 * La query di esempio del progetto è "iphone 12 ios 27", e la risposta attesa
 * comprende sia la scheda **iPhone 12** sia l'argomento **iOS 27**. Nessuna
 * singola voce dell'indice contiene tutti e quattro i token: una regola "devono
 * combaciare tutti" restituirebbe zero risultati proprio sulla query che il
 * progetto porta come esempio.
 *
 * Si punteggia quindi sulla **frazione** di token trovati, con una soglia che
 * tiene fuori il rumore: una voce che intercetta un token su quattro — tutte
 * quelle che contengono "iphone" — non passa. Chi cerca due entità le trova
 * entrambe, chi cerca una entità non si porta dietro mezzo archivio.
 */

/**
 * Frazione minima di token che una voce deve intercettare, per lunghezza della
 * query.
 *
 * La regola: **una query di uno o due token deve combaciare per intero, una più
 * lunga può combaciare a metà.**
 *
 * Non è una soglia scelta a occhio, ma la distinzione fra due intenzioni
 * diverse. Chi scrive "apple pay" sta nominando una cosa sola, e una voce che
 * intercetta il solo "apple" non è una risposta parziale: è un'altra cosa —
 * senza questa regola la query restituiva cinque prodotti Apple qualsiasi.
 * Chi scrive "iphone 12 ios 27" sta invece nominando due entità, e nessuna voce
 * può contenerle entrambe: lì la corrispondenza parziale è l'unica possibile.
 *
 * Verificato sui dati reali: la soglia piena a due token elimina «LG Monitor
 * 27"» dalla ricerca "ios 27" e le versioni di iOS non pertinenti (13.7, 26.4,
 * 10.3.4) che comparivano sopra l'argomento iOS 27.
 */
function minCoverageFor(tokenCount: number): number {
  return tokenCount <= 2 ? 1 : 0.5;
}

/** Token più corti di così sono rumore, tranne i numeri ("12", "27", "5"). */
const MIN_TOKEN_LENGTH = 2;

/**
 * Priorità di categoria a parità di pertinenza.
 *
 * Chi digita "iPhone 12" nella maggior parte dei casi vuole la scheda tecnica,
 * non l'articolo del 2021 che lo nominava di sfuggita.
 */
const KIND_BONUS: Record<SearchResultKind, number> = {
  // Una sezione del sito è la risposta più diretta possibile: chi la cerca la
  // sta cercando, non sta cercando ciò che contiene.
  section: 0.34,
  device: 0.30,
  os: 0.28,
  topic: 0.26,
  product: 0.20,
  category: 0.16,
  article: 0,
};

/**
 * Normalizza un testo per il confronto.
 *
 * Riusa `slugify`, che toglie già i segni diacritici: così "compatibilità" e
 * "compatibilita" sono la stessa cosa, come lo sono negli slug del sito.
 */
export function normalize(value: string): string {
  return slugify(value).replace(/-/g, " ");
}

/** Spezza la query in token confrontabili, scartando quelli non informativi. */
export function tokenize(query: string): string[] {
  return normalize(query)
    .split(" ")
    .filter((token) => token.length >= MIN_TOKEN_LENGTH || /^\d+$/.test(token));
}

/**
 * Vero se un token compare nel testo come parola intera o come suo prefisso.
 *
 * Il prefisso serve alla ricerca mentre si digita: "iphon" deve già trovare
 * iPhone. Non si ammette invece il match a metà parola — "one" non deve trovare
 * "iPhone" — perché su un archivio di migliaia di titoli produce accostamenti
 * che sembrano casuali.
 *
 * **I numeri fanno eccezione e devono combaciare esattamente.** In questo
 * dominio una cifra non è una parola a metà ma un identificativo: 12, 120 e 128
 * sono tre cose diverse. Verificato in produzione: con il prefisso attivo anche
 * sui numeri, la ricerca "iphone 12" restituiva «Apple iPhone 17 Pro … 120Hz»,
 * perché "12" apre "120". Si perde il completamento mentre si digita un numero —
 * "ios 2" non anticipa più iOS 27 — e si guadagna che un modello non venga mai
 * scambiato per un altro.
 */
function tokenMatches(token: string, haystackTokens: readonly string[]): boolean {
  if (/^\d+$/.test(token)) return haystackTokens.includes(token);
  return haystackTokens.some((word) => word.startsWith(token));
}

/**
 * Punteggio di una voce rispetto alla query, oppure `null` se non pertinente.
 *
 * `null` e non zero: "non pertinente" è una decisione, e restituire zero
 * lascerebbe al chiamante il compito di ricordarsi di filtrare.
 */
export function scoreEntry(queryTokens: readonly string[], entry: SearchEntry): SearchResult | null {
  if (queryTokens.length === 0) return null;

  const title = normalize(entry.title);
  const titleTokens = title.split(" ").filter(Boolean);
  const keywordTokens = (entry.keywords ?? [])
    .flatMap((keyword) => normalize(keyword).split(" "))
    .filter(Boolean);
  const haystack = [...titleTokens, ...keywordTokens];

  let matched = 0;
  let matchedNonNumeric = 0;
  const matchedTitleTokens = new Set<string>();
  for (const token of queryTokens) {
    if (!tokenMatches(token, haystack)) continue;
    matched += 1;
    if (!/^\d+$/.test(token)) matchedNonNumeric += 1;
    for (const word of titleTokens) {
      if (word.startsWith(token)) matchedTitleTokens.add(word);
    }
  }
  if (matched === 0) return null;

  /**
   * Una voce agganciata ai soli numeri non è una risposta.
   *
   * Verificato in produzione: la ricerca "iphone 12 ios 27" restituiva «LG
   * 27U411A Monitor 27"» perché il codice di modello contiene entrambe le cifre.
   * Le cifre qualificano un'entità ("iOS 27"), da sole non ne identificano una.
   * L'eccezione è la query fatta di soli numeri, dove non c'è altro da chiedere.
   */
  const queryHasWords = queryTokens.some((token) => !/^\d+$/.test(token));
  if (queryHasWords && matchedNonNumeric === 0) return null;

  const coverage = matched / queryTokens.length;
  const joined = queryTokens.join(" ");
  const isExact = title === joined;
  const isPrefix = title.startsWith(joined);

  /**
   * Il titolo è interamente coperto dalla query: l'utente ha nominato questa
   * cosa per intero.
   *
   * Vale sia come deroga alla soglia sia come bonus di punteggio, perché è lo
   * stesso segnale letto due volte.
   *
   * Come deroga serve alle voci con il titolo corto: l'argomento "AirPods" copre
   * un token su due della ricerca "airpods pro" e senza questa regola sparirebbe,
   * pur essendo esattamente ciò che è stato scritto. La deroga richiede però che
   * resti al massimo **un** token non spiegato — cioè che la query sia questa
   * entità più un qualificatore. Senza quel vincolo, la ricerca "iphone 12 ios
   * 27" faceva rientrare anche l'archivio generico "iPhone", e con lui ogni
   * entità di una parola nominata di sfuggita.
   */
  const titleFullyCovered = titleTokens.length > 0 && matchedTitleTokens.size === titleTokens.length;
  const namedAlmostEntirely = titleFullyCovered && matched >= queryTokens.length - 1;

  // Una corrispondenza esatta, iniziale o che consuma tutto il titolo resta
  // pertinente anche sotto soglia: chi cerca "iphone 12 ios 27" vuole comunque
  // la scheda "iPhone 12".
  if (
    coverage < minCoverageFor(queryTokens.length) &&
    !isExact &&
    !isPrefix &&
    !namedAlmostEntirely
  ) {
    return null;
  }

  /**
   * Il bonus per titolo interamente nominato distingue una risposta da una
   * coincidenza lessicale. Nella query "iphone 12 ios 27" l'articolo "iOS 27: le
   * 12 nuove funzioni in arrivo su iPhone" intercetta tutti e quattro i token —
   * ma per caso, perché il "12" è il numero delle funzioni — e senza questo peso
   * scavalcava la scheda iPhone 12, che di token ne intercetta due su quattro ed
   * è ciò che è stato chiesto.
   */
  const score =
    coverage +
    (isExact ? 0.6 : 0) +
    (isPrefix ? 0.25 : 0) +
    (titleFullyCovered ? 0.5 : 0) +
    KIND_BONUS[entry.kind] +
    // Titolo breve a parità di tutto: "iPhone 12" prima di "iPhone 12 Pro Max".
    Math.max(0, 0.1 - titleTokens.length * 0.01);

  return { ...entry, score, matchedTokens: matched };
}

/**
 * Ordina e taglia i risultati di una categoria.
 *
 * L'ordinamento a parità di punteggio usa il titolo, non l'ordine di
 * inserimento: senza, due voci equivalenti si scambierebbero di posto fra una
 * richiesta e l'altra e l'elenco sembrerebbe instabile.
 */
export function rankResults(results: SearchResult[], limit: number): SearchResult[] {
  return [...results]
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.matchedTokens - a.matchedTokens ||
        a.title.localeCompare(b.title, "it"),
    )
    .slice(0, limit);
}

/** Applica il punteggio a un indice intero, scartando le voci non pertinenti. */
export function searchEntries(
  queryTokens: readonly string[],
  entries: readonly SearchEntry[],
): SearchResult[] {
  const out: SearchResult[] = [];
  for (const entry of entries) {
    const result = scoreEntry(queryTokens, entry);
    if (result) out.push(result);
  }
  return out;
}
