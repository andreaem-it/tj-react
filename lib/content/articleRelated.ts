import { fetchRelatedPosts, type PostListItem } from "@/lib/api";
import { classifyPost } from "@/lib/content/classify";
import { loadTopicArticles } from "@/lib/content/hubData";
import {
  buildStoryTimeline,
  isCorrelatingTopic,
  rankRelated,
  type RelatedCandidate,
  type StoryTimeline,
} from "@/lib/content/related";
import type { Topic } from "@/lib/content/types";

/**
 * Correlati e sviluppi di storia per la pagina articolo.
 *
 * **Modulo server-only.**
 *
 * ## Cosa sostituisce
 *
 * I correlati erano `fetchRelatedPosts`: stessa categoria, ordinati per numero
 * di letture. Su un contatore che in produzione vale fra 0 e 5, quell'ordine è
 * casuale, e la categoria è un contenitore troppo largo — nel campione reale
 * cinque articoli su iPhone 18 stanno in quattro categorie diverse, quindi i
 * pezzi più pertinenti erano proprio quelli che la categoria escludeva.
 *
 * ## Da dove arrivano i candidati
 *
 * Dall'hub dell'argomento principale, tramite `loadTopicArticles`: è la stessa
 * chiamata che serve la pagina `/topic/<slug>`, quindi passa dalla sua Data
 * Cache e in condizioni normali non costa una richiesta in più. Se l'articolo
 * non ha un argomento abbastanza specifico si ricade sull'insieme di categoria,
 * che resta meglio di niente.
 */

/** Articoli mostrati come correlati. */
const RELATED_LIMIT = 8;
/** Sviluppi mostrati per lato della storia. */
const STORY_LIMIT = 3;

export interface ArticleRelatedResult {
  /** Correlati, ordinati per pertinenza. */
  related: PostListItem[];
  /**
   * Vero se i correlati vengono dall'argomento e non dal ripiego di categoria.
   *
   * Serve all'interfaccia per non promettere una pertinenza che non c'è:
   * l'intestazione cambia di conseguenza.
   */
  byTopic: boolean;
  story: StoryTimeline | null;
}

function toCandidate(post: PostListItem): RelatedCandidate {
  return {
    post,
    classification: classifyPost({
      title: post.title,
      excerpt: post.excerpt,
      categorySlug: post.categorySlug,
    }),
  };
}

export async function loadArticleRelated(params: {
  post: Pick<PostListItem, "id" | "slug" | "date" | "title" | "excerpt" | "categorySlug" | "categoryId">;
  /** Topic principali dell'articolo, già calcolati da `enrichArticle`. */
  topics: readonly Topic[];
  /**
   * Istante di riferimento per la prossimità temporale.
   *
   * Ha un valore predefinito qui e non nel chiamante: letto nel corpo di un
   * Server Component, `Date.now()` viola la regola di purezza del compilatore
   * React. Questo modulo non è un componente, quindi è il posto giusto in cui
   * leggere l'orologio — e le funzioni pure a valle continuano a riceverlo come
   * parametro, restando riproducibili.
   */
  now?: number;
}): Promise<ArticleRelatedResult> {
  const { post, topics } = params;
  const now = params.now ?? Date.now();

  const base: RelatedCandidate = {
    post: post as PostListItem,
    classification: {
      contentType: "news",
      reliability: "unspecified",
      // I topic arrivano dall'arricchimento completo, che ha letto anche il
      // corpo dell'articolo: sono più precisi di quelli ricavabili dal solo
      // titolo, e vanno usati così come sono.
      topics: [...topics],
    },
  };

  const primaryTopic = topics.find(isCorrelatingTopic);

  const [topicPool, categoryPool] = await Promise.all([
    primaryTopic
      ? loadTopicArticles(primaryTopic, { pages: 1 }).catch(() => [] as PostListItem[])
      : Promise.resolve([] as PostListItem[]),
    fetchRelatedPosts({ baseSlug: post.slug, categoryId: post.categoryId, limit: 12 }).catch(
      () => [] as PostListItem[],
    ),
  ]);

  const seen = new Set<number>([post.id]);
  const candidates: RelatedCandidate[] = [];
  for (const candidate of [...topicPool, ...categoryPool]) {
    if (seen.has(candidate.id)) continue;
    seen.add(candidate.id);
    candidates.push(toCandidate(candidate));
  }

  const byTopic = rankRelated(base, candidates, { now, limit: RELATED_LIMIT });
  const story = buildStoryTimeline(base, candidates, { limit: STORY_LIMIT });

  if (byTopic.length > 0) {
    return { related: byTopic, byTopic: true, story };
  }

  // Ripiego: nessun argomento in comune. Si mostrano gli articoli della
  // categoria, dichiarandoli per quello che sono.
  return {
    related: categoryPool.filter((p) => p.id !== post.id).slice(0, RELATED_LIMIT),
    byTopic: false,
    story,
  };
}
