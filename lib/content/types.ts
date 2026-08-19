/**
 * Tipi dello strato editoriale (knowledge layer).
 *
 * Nessuno di questi valori arriva dall'API WordPress: `tj/v1` espone solo
 * categoria, date, autore e contenuto. Sono tutti *derivati* in modo
 * deterministico dal contenuto stesso (`lib/content/*`), quindi si applicano
 * anche all'archivio storico senza migrazioni e senza chiamate a un LLM.
 */

/**
 * Tipo editoriale del contenuto.
 *
 * `deal` non è un formato redazionale ma la categoria `offerte`: resta distinto
 * perché non deve finire nei conteggi delle news né nelle sezioni editoriali.
 */
export type ContentType =
  | "news"
  | "guide"
  | "review"
  | "deep-dive"
  | "comparison"
  | "deal";

/**
 * Grado di affidabilità dell'informazione (§18).
 *
 * `unspecified` è volutamente un valore a sé e non un sinonimo di `report`:
 * "non ho rilevato alcun segnale" è un'affermazione diversa da "è un report", e
 * confonderle significherebbe attribuire una fonte a un articolo che non la
 * dichiara. Solo `official`, `report` e `rumor` producono un badge visibile.
 */
export type Reliability = "official" | "report" | "rumor" | "unspecified";

/**
 * Natura dell'entità nel grafo.
 *
 * Serve a due cose: scegliere l'etichetta mostrata all'utente e decidere la
 * specificità (un `os-release` batte il suo `os-family` nelle chip).
 */
export type TopicKind =
  | "company"
  | "os-family"
  | "os-release"
  | "device-family"
  | "device-model"
  | "service"
  | "feature"
  | "event"
  | "theme";

/**
 * Alias di un topic.
 *
 * Stringa semplice = confronto senza distinzione di maiuscole (il caso normale).
 * Forma oggetto = confronto esatto, per gli alias la cui versione minuscola è
 * una parola italiana comune.
 */
export type TopicAlias = string | { readonly text: string; readonly matchCase: true };

/** Collegamento a una scheda del database Compatibilità Apple. */
export interface CompatibilityLink {
  kind: "device" | "os";
  /** Slug reale in `/api/compatibility/{device,os}/[slug]` (es. `iphone-18`). */
  slug: string;
}

/**
 * Voce del registry: entità e topic sono la stessa cosa vista da due lati.
 *
 * `Apple` è un'entità (compare in mille articoli, non è un argomento), `iOS 27`
 * è un topic (ha uno svolgimento nel tempo). La differenza operativa è `hub`,
 * non il tipo di dato: tenerli in un unico grafo è ciò che permette al matcher
 * di risolvere la specificità (`iOS 27` implica `iOS`) con una sola passata.
 */
export interface Topic {
  /** Identificatore stabile. Con `hub` attivo diventa anche l'URL `/topic/<slug>`. */
  slug: string;
  /** Nome mostrato all'utente, con la capitalizzazione redazionale corretta. */
  name: string;
  kind: TopicKind;
  /**
   * Forme testuali con cui l'argomento compare negli articoli.
   *
   * Gli alias sono confrontati su confine di parola e, per default, senza
   * distinzione di maiuscole. La forma `{ text, matchCase: true }` esiste
   * perché per alcuni alias il default è semplicemente sbagliato: `AI`
   * confrontato senza distinzione di caso colpisce la preposizione italiana
   * "ai" ("ai clienti", "ai link") in quasi ogni articolo del sito, e `Pixel`
   * colpisce "pixel" come unità di misura.
   */
  aliases: readonly TopicAlias[];
  /**
   * Descrizione dell'argomento per l'hub e la meta description.
   *
   * Deve restare vera senza manutenzione: niente numeri di versione correnti,
   * niente date, niente stato ("attualmente in beta 6"). Quei dati arrivano
   * dagli articoli, non da qui.
   */
  description: string;
  /** Topic più generico implicato da questo (`iOS 27` → `iOS`). */
  parent?: string;
  /** Slug di topic affini, per la navigazione laterale dell'hub. */
  related?: readonly string[];
  /**
   * Termini passati alla ricerca WP per popolare l'hub.
   *
   * Se assente si usa `name`. La ricerca serve al *recall*; la precisione la
   * garantisce il matcher, rieseguito sui risultati.
   */
  searchTerms?: readonly string[];
  compatibility?: CompatibilityLink;
  /**
   * `false` = entità utile all'estrazione ma senza pagina `/topic/<slug>`.
   *
   * È la protezione contro la cannibalizzazione (§70): `apple`, `iphone`,
   * `mac`, `ios` hanno già un archivio di categoria che si posiziona. Un hub
   * sullo stesso argomento competerebbe con esso invece di aggiungere valore.
   */
  hub?: boolean;
  /**
   * Destinazione alternativa quando `hub` è `false`: l'archivio di categoria
   * che copre già l'argomento (`/apple`, `/ia`, …).
   *
   * Esiste per tenere `topicHref()` una funzione pura. La corrispondenza
   * slug-registry → slug-URL non è deducibile qui senza importare `lib/api`
   * (che tira dentro `next/cache` e renderebbe il registry non testabile con
   * `node --test`), e non è nemmeno meccanica: la categoria
   * `intelligenza-artificiale` è servita su `/ia`.
   */
  archiveHref?: string;
}

/** Esito del matching di un singolo topic su un articolo. */
export interface TopicMatch {
  topic: Topic;
  /** Punteggio di rilevanza; vedi `scoreTopic` in `lib/content/match.ts`. */
  score: number;
  /** L'argomento compare nel titolo: segnale molto più forte del corpo. */
  inTitle: boolean;
  /** Occorrenze totali su titolo + excerpt + contenuto. */
  hits: number;
}

/** Voce dell'indice dei contenuti, ricavata dagli heading dell'articolo. */
export interface TocEntry {
  /** Ancora `id` presente nell'HTML renderizzato. */
  id: string;
  text: string;
  level: 2 | 3;
}

/** Classificazione ricavabile dai soli campi di lista (titolo, excerpt, categoria). */
export interface PostClassification {
  contentType: ContentType;
  reliability: Reliability;
  /** Topic principali, già risolti per specificità. Massimo `MAX_PRIMARY_TOPICS`. */
  topics: Topic[];
}

/** Classificazione completa, disponibile solo dove c'è il contenuto integrale. */
export interface ArticleEnrichment extends PostClassification {
  /** Tutte le entità rilevate, ordinate per rilevanza. Base per l'internal linking. */
  entities: Topic[];
  /** Minuti di lettura, calcolati sul testo reale (§15). */
  readingMinutes: number;
  /** Parole del corpo, per `wordCount` in JSON-LD. */
  wordCount: number;
  toc: TocEntry[];
  /**
   * HTML già sanificato **e** con gli `id` degli heading iniettati.
   *
   * Il nome dichiara la garanzia: chi lo riceve non deve sanificare di nuovo.
   */
  safeHtml: string;
}
