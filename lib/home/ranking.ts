import type { PostListItem } from "@/lib/api";
import { classifyPost } from "@/lib/content/classify";
import type { ContentType, PostClassification, Reliability, Topic } from "@/lib/content/types";

/**
 * Ranking automatico della home (§11).
 *
 * Modulo puro e deterministico: nessun I/O, nessuna chiamata a un modello,
 * `now` passato come parametro. La home si compone da sola a ogni rigenerazione
 * e non richiede curatela quotidiana.
 *
 * ## Il segnale che manca, e perché non lo usiamo lo stesso
 *
 * La formula prevista dal progetto è
 * `recency + trafficVelocity + editorialImportance + topicImportance + manualBoost`.
 * Verificato sui dati di produzione: su 40 articoli la distribuzione di
 * `viewCount` è `{0: 34, 1: 6}`, e i contatori reali di tj-api restituiscono
 * valori fra 1 e 5. Non è traffico basso, è **assenza di misura**.
 *
 * Includere `trafficVelocity` con un peso qualsiasi renderebbe la classifica
 * *peggiore* della sola cronologia: ordinerebbe articoli per 2 letture contro 1,
 * cioè per rumore, e lo presenterebbe come "più letti". Il termine c'è, ha il
 * suo peso, ed è **azzerato finché il massimo delle letture non supera
 * `MIN_VIEWS_FOR_TRAFFIC_SIGNAL`**. Quando il contatore comincerà a misurare
 * davvero, il segnale si accende da solo: nessuna modifica al codice.
 *
 * È la stessa disciplina della confidenza nel price score — un dato che non c'è
 * non diventa un dato debole, resta assente.
 */

/**
 * Letture massime richieste nell'insieme perché il traffico conti qualcosa.
 *
 * Sotto questa soglia la differenza fra il primo e il decimo articolo è di
 * poche unità, cioè entro la variabilità di un contatore che perde eventi per
 * consenso ai cookie, blocco degli script e cache CDN.
 */
export const MIN_VIEWS_FOR_TRAFFIC_SIGNAL = 50;

/**
 * Tempo di dimezzamento della freschezza, in ore.
 *
 * TechJournal pubblica una decina di pezzi al giorno: con 24 ore un articolo di
 * mezza giornata vale 0,71, uno di un giorno 0,50 e uno di tre giorni 0,13.
 * Abbastanza rapido da tenere la home viva, abbastanza lento da non far sparire
 * un pezzo importante uscito la sera prima.
 */
const RECENCY_HALF_LIFE_HOURS = 24;

/**
 * Pesi dei segnali.
 *
 * La freschezza domina perché è una testata di notizie: gli altri segnali
 * riordinano articoli di età simile, non ribaltano la cronologia. `TRAFFIC` è
 * dichiarato al valore che avrà quando il dato esisterà.
 */
const WEIGHTS = {
  recency: 1,
  editorial: 0.35,
  topicHeat: 0.25,
  traffic: 0.5,
} as const;

/** Contributo del formato editoriale, prima della correzione per affidabilità. */
const CONTENT_TYPE_SCORE: Record<ContentType, number> = {
  news: 1,
  review: 1,
  "deep-dive": 0.9,
  comparison: 0.75,
  // Le guide non valgono meno come contenuto: valgono meno *in apertura di
  // home*, dove competono con l'attualità. Hanno una sezione propria, dove la
  // freschezza non conta e loro vincono.
  guide: 0.7,
  deal: 0.5,
};

/**
 * Correzione per grado di affidabilità.
 *
 * Un'indiscrezione non apre la home davanti a una notizia confermata. È una
 * scelta editoriale resa esplicita in un numero, invece che lasciata al caso
 * dell'ordine di pubblicazione.
 */
const RELIABILITY_ADJUSTMENT: Record<Reliability, number> = {
  official: 0.1,
  report: 0,
  unspecified: 0,
  rumor: -0.15,
};

/** Articolo con la classificazione già calcolata, per non rifarla a ogni uso. */
export interface RankableItem {
  post: PostListItem;
  classification: PostClassification;
}

/** Dettaglio del punteggio, utile a spiegare e a diagnosticare un ordinamento. */
export interface RankingSignals {
  recency: number;
  editorial: number;
  topicHeat: number;
  traffic: number;
  boost: number;
}

export interface RankedItem extends RankableItem {
  score: number;
  signals: RankingSignals;
  /** Fissato manualmente in cima, fuori dal punteggio. */
  pinned: boolean;
}

export interface RankingOverrides {
  /**
   * Slug fissati in cima, nell'ordine dichiarato.
   *
   * Separati dal punteggio e non realizzati con un boost enorme: "questo pezzo
   * apre la home" è una decisione, non un pollice sulla bilancia, e come boost
   * numerico sarebbe impossibile da distinguere da un segnale forte.
   */
  pinned?: readonly string[];
  /** Correzioni additive al punteggio, per slug. */
  boost?: Readonly<Record<string, number>>;
}

export interface RankingOptions {
  now: number;
  overrides?: RankingOverrides;
}

/** Aggiunge a ogni post la sua classificazione semantica. */
export function prepareItems(posts: readonly PostListItem[]): RankableItem[] {
  return posts.map((post) => ({
    post,
    classification: classifyPost({
      title: post.title,
      excerpt: post.excerpt,
      categorySlug: post.categorySlug,
    }),
  }));
}

function ageHours(post: PostListItem, now: number): number {
  const published = new Date(post.date).getTime();
  if (!Number.isFinite(published)) return Number.POSITIVE_INFINITY;
  // Clamp a 0: una data futura per disallineamento di orologio non deve
  // produrre una freschezza superiore a 1.
  return Math.max(0, (now - published) / 3_600_000);
}

function recencyScore(post: PostListItem, now: number): number {
  const hours = ageHours(post, now);
  if (!Number.isFinite(hours)) return 0;
  return Math.exp(-hours / RECENCY_HALF_LIFE_HOURS);
}

function editorialScore(classification: PostClassification): number {
  const base = CONTENT_TYPE_SCORE[classification.contentType];
  const adjusted = base + RELIABILITY_ADJUSTMENT[classification.reliability];
  return Math.min(1, Math.max(0, adjusted));
}

/**
 * Calore degli argomenti nell'insieme considerato.
 *
 * Un argomento è "caldo" quando molti articoli recenti ne parlano: è il segnale
 * che distingue lo sviluppo di una storia in corso da una notizia isolata, e si
 * ricava interamente dai dati che abbiamo già — nessuna fonte esterna, nessuna
 * stima.
 *
 * Il conteggio è pesato sulla freschezza, altrimenti un argomento molto trattato
 * il mese scorso resterebbe caldo per sempre. Il risultato è normalizzato
 * sull'argomento più caldo, così la scala resta 0-1 qualunque sia la dimensione
 * dell'insieme.
 */
export function computeTopicHeat(
  items: readonly RankableItem[],
  now: number,
): Map<string, number> {
  if (items.length === 0) return new Map();

  // Quanti articoli nominano ciascun argomento, indipendentemente dall'età.
  const documentFrequency = new Map<string, number>();
  for (const item of items) {
    for (const topic of item.classification.topics) {
      documentFrequency.set(topic.slug, (documentFrequency.get(topic.slug) ?? 0) + 1);
    }
  }

  const raw = new Map<string, number>();
  for (const item of items) {
    const weight = recencyScore(item.post, now);
    for (const topic of item.classification.topics) {
      if (isUbiquitous(documentFrequency.get(topic.slug) ?? 0, items.length)) continue;
      raw.set(topic.slug, (raw.get(topic.slug) ?? 0) + weight);
    }
  }

  const max = Math.max(0, ...raw.values());
  if (max <= 0) return new Map();

  const normalized = new Map<string, number>();
  for (const [slug, value] of raw) {
    normalized.set(slug, value / max);
  }
  return normalized;
}

/**
 * Quota di articoli oltre la quale un argomento smette di essere informativo.
 *
 * Su una testata a forte impronta Apple, `apple` compare in quasi ogni articolo:
 * misurato sull'insieme reale della home, il calore dava 1,00 a sei articoli su
 * dieci, cioè non distingueva più nulla. Un argomento presente ovunque non dice
 * *quale* pezzo conta oggi — dice solo di che sito si tratta.
 *
 * La soglia è sulla frequenza documentale e non su un elenco di argomenti da
 * escludere a mano: si adatta da sola se domani il sito parlasse soprattutto
 * d'altro, e non va mantenuta.
 */
const MAX_TOPIC_UBIQUITY = 0.5;

function isUbiquitous(documentFrequency: number, total: number): boolean {
  // Con pochissimi articoli la frazione è instabile (due articoli su tre fanno
  // già il 67%): la regola si applica solo quando l'insieme è abbastanza grande
  // da renderla significativa.
  if (total < 6) return false;
  return documentFrequency / total > MAX_TOPIC_UBIQUITY;
}

function topicHeatScore(
  classification: PostClassification,
  heat: ReadonlyMap<string, number>,
): number {
  // Il massimo e non la somma: un articolo che parla dell'argomento del momento
  // è rilevante quanto quell'argomento è caldo, non di più perché ne nomina
  // anche altri due tiepidi.
  let best = 0;
  for (const topic of classification.topics) {
    const value = heat.get(topic.slug) ?? 0;
    if (value > best) best = value;
  }
  return best;
}

/**
 * Giorni entro cui una lettura conta come segnale di traffico.
 *
 * Serve a distinguere un dato **vivo** da un totale **congelato**, ed è una
 * distinzione che i dati reali impongono: `viewCount` di WordPress ha smesso di
 * essere aggiornato con la migrazione del contatore su Postgres, quindi vale 0
 * su tutti gli articoli recenti ma conserva i totali storici su quelli vecchi —
 * 4.798 su un pezzo del 2020, 5.128 su uno del 2021.
 *
 * Senza questo vincolo, un archivio di soli articoli vecchi (`/stadia`,
 * `/playstation`, `/wi-fi`) superava la soglia grazie a quei totali e mostrava
 * una classifica "Più letti" ricavata da numeri fermi da cinque anni, che non
 * potrà mai cambiare. È lo stesso difetto che la soglia doveva evitare, in altra
 * forma: un dato grande non è un dato attuale.
 */
const TRAFFIC_SIGNAL_MAX_AGE_DAYS = 30;

/**
 * Vero se le letture nell'insieme sono abbastanza **e abbastanza recenti** da
 * ordinarci qualcosa.
 *
 * Esportata perché la decide *anche* la sidebar delle classifiche: se il
 * traffico non è misurabile, "più letti" non va mostrato affatto.
 */
export function hasUsableTrafficSignal(
  posts: readonly PostListItem[],
  { now }: { now: number },
): boolean {
  const cutoff = now - TRAFFIC_SIGNAL_MAX_AGE_DAYS * 24 * 3_600_000;
  let max = 0;
  for (const post of posts) {
    const published = new Date(post.date).getTime();
    if (!Number.isFinite(published) || published < cutoff) continue;
    const views = post.viewCount ?? 0;
    if (views > max) max = views;
  }
  return max >= MIN_VIEWS_FOR_TRAFFIC_SIGNAL;
}

/**
 * Velocità di lettura: letture per ora dalla pubblicazione.
 *
 * Non il totale assoluto — quello premia soltanto gli articoli vecchi, che hanno
 * avuto più tempo per accumulare (§55).
 */
function velocity(post: PostListItem, now: number): number {
  const views = post.viewCount ?? 0;
  if (views <= 0) return 0;
  // Minimo un'ora: nei primi minuti la divisione produrrebbe valori enormi.
  return views / Math.max(1, ageHours(post, now));
}

/**
 * Ordina gli articoli per punteggio di home.
 *
 * Gli articoli fissati manualmente escono in testa nell'ordine dichiarato, e non
 * partecipano al punteggio. Tutti gli altri seguono per punteggio decrescente,
 * con la data come spareggio: senza, due articoli con gli stessi segnali si
 * ordinerebbero in modo arbitrario e la home cambierebbe a ogni rigenerazione
 * senza motivo.
 */
export function rankHomeItems(
  items: readonly RankableItem[],
  { now, overrides }: RankingOptions,
): RankedItem[] {
  const heat = computeTopicHeat(items, now);
  const trafficUsable = hasUsableTrafficSignal(items.map((i) => i.post), { now });
  const maxVelocity = trafficUsable
    ? Math.max(0, ...items.map((item) => velocity(item.post, now)))
    : 0;

  const pinnedOrder = new Map((overrides?.pinned ?? []).map((slug, index) => [slug, index]));
  const boosts = overrides?.boost ?? {};

  const ranked = items.map((item): RankedItem => {
    const signals: RankingSignals = {
      recency: recencyScore(item.post, now),
      editorial: editorialScore(item.classification),
      topicHeat: topicHeatScore(item.classification, heat),
      traffic:
        trafficUsable && maxVelocity > 0 ? velocity(item.post, now) / maxVelocity : 0,
      boost: boosts[item.post.slug] ?? 0,
    };

    const score =
      signals.recency * WEIGHTS.recency +
      signals.editorial * WEIGHTS.editorial +
      signals.topicHeat * WEIGHTS.topicHeat +
      signals.traffic * WEIGHTS.traffic +
      signals.boost;

    return { ...item, score, signals, pinned: pinnedOrder.has(item.post.slug) };
  });

  return ranked.sort((a, b) => {
    if (a.pinned || b.pinned) {
      const ai = pinnedOrder.get(a.post.slug) ?? Number.POSITIVE_INFINITY;
      const bi = pinnedOrder.get(b.post.slug) ?? Number.POSITIVE_INFINITY;
      if (ai !== bi) return ai - bi;
    }
    if (b.score !== a.score) return b.score - a.score;
    return new Date(b.post.date).getTime() - new Date(a.post.date).getTime();
  });
}

/** Argomento caldo con il numero di articoli recenti che lo trattano. */
export interface HotTopicEntry {
  topic: Topic;
  count: number;
  heat: number;
}

/**
 * Argomenti del momento, ordinati per calore.
 *
 * Alimenta la sidebar che sostituisce "Più letti" finché il contatore di
 * visualizzazioni non misura abbastanza. Restituisce solo argomenti con una
 * pagina di destinazione: un elenco di voci non cliccabili non serve a nessuno.
 */
export function hotTopics(
  items: readonly RankableItem[],
  now: number,
  options: { limit?: number; minArticles?: number } = {},
): HotTopicEntry[] {
  const limit = options.limit ?? 6;
  const minArticles = options.minArticles ?? 2;

  const counts = new Map<string, number>();
  const byslug = new Map<string, Topic>();
  for (const item of items) {
    for (const topic of item.classification.topics) {
      counts.set(topic.slug, (counts.get(topic.slug) ?? 0) + 1);
      byslug.set(topic.slug, topic);
    }
  }

  const heat = computeTopicHeat(items, now);
  const entries: HotTopicEntry[] = [];
  for (const [slug, value] of heat) {
    const topic = byslug.get(slug);
    const count = counts.get(slug) ?? 0;
    if (!topic || count < minArticles) continue;
    // Le voci senza destinazione propria non entrano: `topicHref` le
    // risolverebbe sull'archivio di categoria, che il menu principale linka già.
    if (topic.hub === false) continue;
    entries.push({ topic, count, heat: value });
  }

  return entries.sort((a, b) => b.heat - a.heat || b.count - a.count).slice(0, limit);
}

/**
 * Argomento del momento, per la sezione "speciale".
 *
 * Restituisce solo argomenti con una pagina hub: lo speciale rimanda a
 * `/topic/<slug>`, e un archivio di categoria come `/apple` non è quello che
 * serve lì — la home ha già quella voce nel menu, e la sezione prometterebbe un
 * approfondimento consegnando un elenco.
 */
export function hottestTopicSlug(
  items: readonly RankableItem[],
  now: number,
  options: { minArticles?: number } = {},
): string | null {
  const minArticles = options.minArticles ?? 3;

  const counts = new Map<string, number>();
  const hubSlugs = new Set<string>();
  for (const item of items) {
    for (const topic of item.classification.topics) {
      counts.set(topic.slug, (counts.get(topic.slug) ?? 0) + 1);
      if (topic.hub !== false) hubSlugs.add(topic.slug);
    }
  }

  const heat = computeTopicHeat(items, now);
  let bestSlug: string | null = null;
  let bestHeat = 0;
  for (const [slug, value] of heat) {
    if (!hubSlugs.has(slug)) continue;
    // La soglia sul numero di articoli è ciò che distingue una storia in corso
    // da una notizia isolata che ha semplicemente il vantaggio di essere
    // uscita da poco.
    if ((counts.get(slug) ?? 0) < minArticles) continue;
    if (value > bestHeat) {
      bestHeat = value;
      bestSlug = slug;
    }
  }
  return bestSlug;
}
