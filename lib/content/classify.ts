import { matchTopics, primaryTopics } from "@/lib/content/match";
import type { ContentType, PostClassification, Reliability } from "@/lib/content/types";

/**
 * Classificatori deterministici su testo italiano.
 *
 * Modulo puro. Nessuna chiamata a un modello: sono regole su pattern
 * linguistici che si possono leggere, testare e correggere. Un LLM potrà in
 * futuro sovrascrivere il risultato dove la confidenza è bassa (§32), ma il
 * valore di default non deve mai dipendere da una rete disponibile (§65).
 */

// ---------------------------------------------------------------------------
// Tipo di contenuto
// ---------------------------------------------------------------------------

/** "Recensione", "recensito", "la nostra prova". */
const REVIEW_TITLE = /(?:^|\W)(?:recension[ei]|recensito|videorecension[ei])(?:\W|$)/i;

/**
 * Confronti e decisioni d'acquisto.
 *
 * "conviene … o …" e "meglio … o …" catturano la forma italiana tipica
 * ("iPhone 17: conviene comprarlo ora o aspettare iPhone 18?"), che è un
 * confronto anche quando il titolo non contiene "vs".
 */
const COMPARISON_TITLE =
  /(?:^|\W)(?:vs\.?|contro)(?:\W|$)|(?:^|\W)confront[oi](?:\W|$)|(?:^|\W)differenz[ae](?:\W|$)|(?:^|\W)(?:conviene|meglio)\b[^?]{0,80}?\bo\b|(?:^|\W)o\s+aspettare\b/i;

/** Guide operative: l'intento è "come si fa". */
const GUIDE_TITLE =
  /^come\b|(?:^|\W)guida(?:\W|$)|(?:^|\W)tutorial(?:\W|$)|(?:^|\W)(?:trucchi|consigli)(?:\W|$)|(?:^|\W)(?:configurare|installare|disinstallare|attivare|disattivare|risolvere|scaricare|trasferire|recuperare)(?:\W|$)/i;

/** Approfondimenti: rassegne complete su un argomento, non singola notizia. */
const DEEP_DIVE_TITLE =
  /(?:^|\W)tutte le (?:novit[àa]|funzion[ie])(?:\W|$)|(?:^|\W)tutto (?:quello che|ci[òo] che|sul|su)(?:\W|$)|(?:^|\W)guida completa(?:\W|$)|(?:^|\W)approfondimento(?:\W|$)|(?:^|\W)speciale(?:\W|$)|(?:^|\W)cosa (?:sappiamo|aspettarsi)(?:\W|$)/i;

/** Categorie WordPress il cui significato è il formato, non l'argomento. */
const CATEGORY_CONTENT_TYPE: Record<string, ContentType> = {
  guide: "guide",
  offerte: "deal",
  recensioni: "review",
};

export interface ClassifyInput {
  title: string;
  /** Slug WordPress della categoria (non lo slug URL). */
  categorySlug?: string;
}

/**
 * Tipo editoriale di un articolo.
 *
 * Ordine di valutazione, e il motivo:
 *
 * 1. **Titolo per recensione e confronto.** Sono i due formati che la categoria
 *    sbaglia sistematicamente: "iPhone 17: conviene comprarlo ora o aspettare
 *    iPhone 18?" sta in `guide` ma è un confronto, e un confronto ha una
 *    struttura di pagina e un intento di ricerca diversi da una guida.
 * 2. **Categoria.** `guide` e `offerte` sono assegnate a mano e affidabili per
 *    quello che dichiarano.
 * 3. **Titolo per guida e approfondimento**, per i pezzi finiti in categorie
 *    tematiche.
 * 4. **`news`** come default: è ciò che il sistema automatico produce.
 */
export function classifyContentType({ title, categorySlug }: ClassifyInput): ContentType {
  const t = title ?? "";

  if (REVIEW_TITLE.test(t)) return "review";
  if (COMPARISON_TITLE.test(t)) return "comparison";

  const fromCategory = categorySlug ? CATEGORY_CONTENT_TYPE[categorySlug] : undefined;
  if (fromCategory) return fromCategory;

  if (GUIDE_TITLE.test(t)) return "guide";
  if (DEEP_DIVE_TITLE.test(t)) return "deep-dive";

  return "news";
}

/** Etichetta italiana del tipo di contenuto, per badge e intestazioni. */
export const CONTENT_TYPE_LABEL: Record<ContentType, string> = {
  news: "Notizia",
  guide: "Guida",
  review: "Recensione",
  "deep-dive": "Approfondimento",
  comparison: "Confronto",
  deal: "Offerta",
};

/**
 * Tipi che non invecchiano con la data di pubblicazione.
 *
 * Distinzione operativa e non decorativa: per questi conta la data di
 * *aggiornamento*, vanno preferibilmente aggiornati invece di riscritti (§19,
 * §36) e non hanno senso in una sezione "ultime notizie".
 */
export function isEvergreen(contentType: ContentType): boolean {
  return contentType === "guide" || contentType === "comparison" || contentType === "deep-dive";
}

// ---------------------------------------------------------------------------
// Affidabilità
// ---------------------------------------------------------------------------

/**
 * Marcatori di speculazione in italiano.
 *
 * Volutamente **senza** "in arrivo", "atteso" e "previsto": nel corpus reale
 * quelle formule accompagnano tanto le indiscrezioni quanto i fatti già
 * ufficiali ("Apple Pay in India entro ottobre"), quindi come segnale sarebbero
 * rumore. Restano solo le forme che qualificano davvero la certezza
 * dell'affermazione.
 */
const RUMOR_MARKERS =
  /(?:^|\W)(?:rumor|indiscrezion\w+|si vocifera|si dice|leak|trapelat\w+|possibil\w+|potrebbe(?:ro)?|presunt\w+|suggerisc\w+|indizi\w*|ipotes\w+|ipotetic\w+|voci di corridoio|non confermat\w+|sembrerebbe|parrebbe)(?:\W|$)/i;

/**
 * Il soggetto della notizia ha agito, e l'azione è verificabile.
 *
 * "rilascia", "annuncia", "conferma", "pubblica" descrivono un atto compiuto da
 * un'azienda; "disponibile" e "ufficiale" descrivono uno stato constatabile.
 */
const OFFICIAL_MARKERS =
  /(?:^|\W)(?:rilascia(?:no|to|ti)?|annuncia(?:no|to|ti)?|presenta(?:no|to|ti)?|pubblica(?:no|to|ti)?|conferma(?:no|to|ti)?|lancia(?:no|to|ti)?|introduce|aggiorna|disponibil\w+|ufficial\w+|debutta)(?:\W|$)/i;

/** L'informazione è attribuita a una fonte giornalistica o d'analisi. */
const REPORT_MARKERS =
  /(?:^|\W)(?:secondo|report|analist[ai]|fonti|bloomberg|gurman|reuters|the information|wsj|nikkei|digitimes|the elec)(?:\W|$)/i;

export interface ReliabilityInput {
  title: string;
  excerpt?: string;
}

/**
 * Grado di affidabilità dichiarabile a partire dal linguaggio usato.
 *
 * Il titolo vince sempre sull'excerpt: è lì che l'affermazione viene fatta, e
 * un articolo intitolato "possibile aumento della batteria" resta una
 * speculazione anche se l'excerpt cita un report.
 *
 * All'interno dello stesso testo la speculazione batte l'ufficialità, perché
 * un marcatore dubitativo *qualifica* l'affermazione mentre un verbo come
 * "rilascia" può comparire in una subordinata ("dopo che Apple ha rilasciato la
 * beta, il chip potrebbe cambiare").
 *
 * Un esito `unspecified` non è un errore: è l'assenza di segnale, e non produce
 * alcun badge. Meglio non dire nulla che attribuire una fonte inventata.
 */
export function classifyReliability({ title, excerpt }: ReliabilityInput): Reliability {
  const fromTitle = reliabilityOf(title ?? "");
  if (fromTitle !== "unspecified") return fromTitle;
  return reliabilityOf(excerpt ?? "");
}

function reliabilityOf(text: string): Reliability {
  if (!text) return "unspecified";
  if (RUMOR_MARKERS.test(text)) return "rumor";
  if (OFFICIAL_MARKERS.test(text)) return "official";
  if (REPORT_MARKERS.test(text)) return "report";
  return "unspecified";
}

/**
 * Etichette dei badge di affidabilità.
 *
 * `unspecified` mappa alla stringa vuota per rendere impossibile, a livello di
 * tipi, mostrare un badge quando non c'è nulla da dichiarare: chi renderizza
 * legge questa tabella e trova un valore falsy.
 */
export const RELIABILITY_LABEL: Record<Reliability, string> = {
  official: "Ufficiale",
  report: "Report",
  rumor: "Rumor",
  unspecified: "",
};

/** Spiegazione mostrata in `title`/`aria-label`: il badge da solo è ambiguo. */
export const RELIABILITY_HINT: Record<Reliability, string> = {
  official: "Informazione comunicata o resa disponibile direttamente dall'azienda",
  report: "Informazione attribuita a un report o a fonti di settore",
  rumor: "Indiscrezione non confermata: può cambiare o rivelarsi errata",
  unspecified: "",
};

/** Minuti di lettura sul testo reale (§15): nessun LLM, nessuna stima a occhio. */
const WORDS_PER_MINUTE = 200;

export function readingMinutes(wordCount: number): number {
  if (wordCount <= 0) return 0;
  return Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE));
}

// ---------------------------------------------------------------------------
// Classificazione da campi di lista
// ---------------------------------------------------------------------------

/** Campi disponibili su un `PostListItem`, cioè senza il corpo dell'articolo. */
export interface ClassifiablePost {
  title: string;
  excerpt?: string;
  /** Slug WordPress della categoria (`intelligenza-artificiale`, non `ia`). */
  categorySlug?: string;
}

/**
 * Classificazione ottenibile dai soli titolo, excerpt e categoria.
 *
 * È la funzione che possono usare card, sezioni della home e hub: lavora sui
 * dati che `PostListItem` già trasporta, quindi non richiede di scaricare il
 * contenuto integrale (che `lib/api` toglie deliberatamente dalle liste per non
 * gonfiare il payload RSC).
 *
 * Il costo è una precisione minore sui topic — un argomento discusso nel corpo
 * ma assente dal titolo non emerge. Per la pagina articolo, dove il contenuto
 * c'è, si usa `enrichArticle`.
 */
export function classifyPost(post: ClassifiablePost): PostClassification {
  const matches = matchTopics({ title: post.title, excerpt: post.excerpt });
  return {
    contentType: classifyContentType({ title: post.title, categorySlug: post.categorySlug }),
    reliability: classifyReliability({ title: post.title, excerpt: post.excerpt }),
    topics: primaryTopics(matches),
  };
}
