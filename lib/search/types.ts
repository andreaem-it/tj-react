/**
 * Tipi della ricerca globale (§28).
 *
 * La ricerca attraversa quattro archivi che fino a ora non si parlavano:
 * articoli (WordPress), argomenti (registry in repo), dispositivi (database
 * Compatibilità) e prodotti (Price Radar). È il punto in cui il lavoro delle
 * fasi precedenti diventa una cosa sola per il lettore.
 */

/**
 * Categoria del risultato.
 *
 * Determina l'intestazione del gruppo e la priorità: a parità di pertinenza una
 * scheda dispositivo precede una notizia, perché chi cerca "iPhone 12" quasi
 * sempre vuole la scheda, non il pezzo del 2021 che lo nominava.
 */
export type SearchResultKind =
  | "section"
  | "topic"
  | "device"
  | "os"
  | "product"
  | "category"
  | "article";

/** Voce dell'indice su cui si calcola la pertinenza. */
export interface SearchEntry {
  kind: SearchResultKind;
  /** Identificatore stabile nella sua categoria (slug, asin, id). */
  id: string;
  title: string;
  /** Riga secondaria: contesto, non ripetizione del titolo. */
  subtitle?: string;
  href: string;
  /**
   * Termini alternativi con cui la voce va trovata.
   *
   * Per gli argomenti sono gli alias del registry, che è esattamente il lavoro
   * già fatto nella prima fase: chi cerca "xrOS" deve trovare visionOS.
   */
  keywords?: readonly string[];
  /** Etichetta breve mostrata a destra (prezzo, anno, valutazione). */
  badge?: string;
}

export interface SearchResult extends SearchEntry {
  score: number;
  /** Quanti token della query hanno trovato riscontro. */
  matchedTokens: number;
}

/** Risultati raggruppati per categoria, nell'ordine in cui vanno mostrati. */
export interface SearchGroup {
  kind: SearchResultKind;
  label: string;
  results: SearchResult[];
}

export interface SearchResponse {
  query: string;
  groups: SearchGroup[];
  /** Vero se la ricerca articoli non ha risposto: l'interfaccia lo dichiara. */
  articlesUnavailable?: boolean;
}

/** Etichette dei gruppi, al plurale come intestazione di elenco. */
export const SEARCH_KIND_LABEL: Record<SearchResultKind, string> = {
  section: "Sezioni",
  device: "Dispositivi",
  os: "Sistemi operativi",
  topic: "Argomenti",
  product: "Price Radar",
  category: "Categorie",
  article: "Articoli",
};

/**
 * Ordine dei gruppi in pagina.
 *
 * Le risposte precise stanno in alto: una scheda dispositivo o un argomento
 * rispondono alla domanda, un elenco di articoli la rimanda. Gli articoli
 * chiudono perché sono il gruppo più numeroso e il meno specifico.
 */
export const SEARCH_KIND_ORDER: readonly SearchResultKind[] = [
  "section",
  "device",
  "os",
  "topic",
  "product",
  "category",
  "article",
];
