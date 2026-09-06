import type { PostListItem } from "@/lib/api";
import type { PostClassification, Topic } from "@/lib/content/types";

/**
 * Correlazione fra articoli e sviluppi di una storia (§33, §34).
 *
 * Modulo puro e deterministico, `now` passato come parametro.
 *
 * ## Cosa dicono i dati, e come ha cambiato il progetto
 *
 * Il capitolo prevedeva un sistema di deduplicazione: individuare che "Apple
 * rilascia Beta 6" e "iOS 27 Beta 6 disponibile" sono la stessa notizia.
 * Misurato su cento articoli consecutivi di produzione, **quel problema qui non
 * esiste**: applicando la regola di specificità degli argomenti resta una sola
 * coppia dubbia, e in ogni caso la decisione di non pubblicare appartiene alla
 * pipeline di ingestion, che vive in un altro repository.
 *
 * La stessa misura ha però mostrato l'opposto: una rete fitta di articoli
 * genuinamente correlati che il sito non mostrava. "iPhone 17: conviene
 * comprarlo o aspettare iPhone 18?" e "iPhone 18 base verso due upgrade pro"
 * condividono `iphone-18` e distano diciotto ore — e nessuno dei due comparirebbe
 * fra i correlati dell'altro, perché i correlati erano "stessa categoria,
 * ordinati per numero di letture" su un contatore che vale fra 0 e 5.
 *
 * Questo modulo sostituisce quel criterio.
 */

/** Articolo con la sua classificazione, già calcolata dal chiamante. */
export interface RelatedCandidate {
  post: PostListItem;
  classification: PostClassification;
}

/** Ore oltre le quali due articoli smettono di appartenere allo stesso momento. */
const RECENCY_WINDOW_HOURS = 72;

const HOUR_MS = 3_600_000;

/**
 * Vero se l'argomento è abbastanza specifico da correlare due articoli.
 *
 * ## Perché dal registry e non dalla frequenza nei dati
 *
 * In home la specificità si misura contando quanti articoli nominano un
 * argomento, e lì funziona: l'insieme è un campione generico della produzione
 * recente. Qui no. L'insieme dei candidati è spesso **già filtrato per
 * argomento** — sono gli articoli di un hub — e in quel caso l'argomento che
 * tiene insieme la storia compare nel 100% dei candidati, quindi la frequenza lo
 * dichiarerebbe ubiquo e lo scarterebbe. Il criterio si annullerebbe da solo
 * proprio dove serve.
 *
 * Il registry conosce già la distinzione, ed è stabile qualunque sia l'insieme:
 *
 * - le **aziende** non correlano: due articoli che parlano entrambi di Apple
 *   non parlano della stessa cosa, parlano dello stesso sito. Verificato su
 *   cento articoli reali: le prime sei coppie candidate condividevano soltanto
 *   `apple`, e accostavano "visionOS 27 beta" a "tvOS 27 beta" — due prodotti
 *   diversi;
 * - gli argomenti **senza hub** sono quelli che duplicano un archivio di
 *   categoria (`iphone`, `ios`, `mac`): larghi per costruzione, è la ragione per
 *   cui nella prima fase non hanno una pagina propria.
 *
 * Restano `ios-27`, `iphone-18`, `siri`, `airpods`, `app-store`: gli argomenti
 * che identificano una vicenda.
 */
export function isCorrelatingTopic(topic: Topic): boolean {
  return topic.kind !== "company" && topic.hub !== false;
}

/** Argomenti condivisi che dicono davvero qualcosa. */
function sharedSpecificTopics(a: readonly Topic[], b: readonly Topic[]): Topic[] {
  const other = new Set(b.map((topic) => topic.slug));
  return a.filter((topic) => other.has(topic.slug) && isCorrelatingTopic(topic));
}

export interface RankRelatedOptions {
  now: number;
  limit?: number;
}

/**
 * Articoli correlati, dal più pertinente.
 *
 * Il segnale principale è il numero di argomenti specifici in comune; la
 * vicinanza temporale interviene solo a parità, perché su una testata due pezzi
 * dello stesso giorno sullo stesso argomento appartengono di norma alla stessa
 * vicenda.
 *
 * Non restituisce nulla quando non c'è alcun argomento in comune: un elenco di
 * "correlati" riempito con articoli casuali della stessa categoria è ciò che
 * questo modulo esiste per eliminare, non qualcosa da replicare come ripiego.
 */
export function rankRelated(
  base: RelatedCandidate,
  candidates: readonly RelatedCandidate[],
  { now, limit = 6 }: RankRelatedOptions,
): PostListItem[] {
  const baseTopics = base.classification.topics;

  const scored: Array<{ post: PostListItem; score: number; date: number }> = [];
  for (const candidate of candidates) {
    if (candidate.post.id === base.post.id) continue;

    const shared = sharedSpecificTopics(baseTopics, candidate.classification.topics);
    if (shared.length === 0) continue;

    const published = new Date(candidate.post.date).getTime();
    const hours = Number.isFinite(published) ? Math.abs(now - published) / HOUR_MS : Infinity;
    // La prossimità vale al massimo quanto mezzo argomento condiviso: avvicina
    // pezzi equivalenti, non ribalta la pertinenza.
    const proximity = Number.isFinite(hours)
      ? Math.max(0, 1 - hours / RECENCY_WINDOW_HOURS) * 0.5
      : 0;

    scored.push({
      post: candidate.post,
      score: shared.length + proximity,
      date: Number.isFinite(published) ? published : 0,
    });
  }

  return scored
    .sort((a, b) => b.score - a.score || b.date - a.date)
    .slice(0, limit)
    .map((entry) => entry.post);
}

export interface StoryTimeline {
  /** Argomento che tiene insieme la storia. */
  topic: Topic;
  /** Sviluppi precedenti, dal più recente. */
  previous: PostListItem[];
  /** Sviluppi successivi all'articolo, dal più vicino. */
  following: PostListItem[];
  /** Articoli totali della storia, incluso quello corrente. */
  total: number;
}

/**
 * Sviluppi della storia a cui appartiene un articolo (§34).
 *
 * Una "storia" è qui l'insieme degli articoli che condividono l'argomento
 * specifico principale, ordinati nel tempo. Non pretende di essere un
 * raggruppamento semantico più fine — riconoscere che due pezzi raccontano lo
 * *stesso evento* richiederebbe una comprensione del testo che nessuna regola
 * deterministica può dare, e inventarla produrrebbe accostamenti sbagliati
 * proprio sugli articoli più letti.
 *
 * Restituisce `null` quando l'argomento non ha abbastanza sviluppi: due articoli
 * non sono una storia, sono due articoli.
 */
export function buildStoryTimeline(
  base: RelatedCandidate,
  candidates: readonly RelatedCandidate[],
  options: { minStorySize?: number; limit?: number } = {},
): StoryTimeline | null {
  const minStorySize = options.minStorySize ?? 3;
  const limit = options.limit ?? 4;

  // L'argomento principale è il primo specifico fra quelli dell'articolo:
  // `primaryTopics` li ha già ordinati per rilevanza e ripuliti dalle
  // generalizzazioni.
  const topic = base.classification.topics.find(isCorrelatingTopic);
  if (!topic) return null;

  const baseTime = new Date(base.post.date).getTime();
  if (!Number.isFinite(baseTime)) return null;

  const inStory = candidates.filter(
    (candidate) =>
      candidate.post.id !== base.post.id &&
      candidate.classification.topics.some((t) => t.slug === topic.slug),
  );
  if (inStory.length + 1 < minStorySize) return null;

  const withTime = inStory
    .map((candidate) => ({ post: candidate.post, time: new Date(candidate.post.date).getTime() }))
    .filter((entry) => Number.isFinite(entry.time));

  const previous = withTime
    .filter((entry) => entry.time < baseTime)
    .sort((a, b) => b.time - a.time)
    .slice(0, limit)
    .map((entry) => entry.post);

  const following = withTime
    .filter((entry) => entry.time > baseTime)
    .sort((a, b) => a.time - b.time)
    .slice(0, limit)
    .map((entry) => entry.post);

  return { topic, previous, following, total: withTime.length + 1 };
}
