import { fetchSearchPosts, type PostListItem } from "@/lib/api";
import {
  COMPATIBILITY_LIST_REVALIDATE_S,
  fetchCompatibilityDevices,
  fetchCompatibilityOsList,
} from "@/lib/compatibility/serverApi";
import { matchesTopic } from "@/lib/content/match";
import { topicSearchTerms } from "@/lib/content/topics";
import type { Topic } from "@/lib/content/types";

/**
 * Caricamento dati degli hub `/topic/[slug]`.
 *
 * **Modulo server-only** (importa `lib/api`).
 *
 * ## Perché ricerca + matcher e non uno dei due
 *
 * La ricerca di WordPress ha ottima copertura e precisione scarsa: verificato
 * in produzione, la query "iOS 27" restituisce anche *"Apple conferma il
 * redesign glass-centric dell'iPhone per il 2027"* — perché "27" compare in
 * "2027" — e *"Top Stories: annunci Apple di settembre"*. Circa metà dei
 * risultati non parla dell'argomento.
 *
 * Usare la sola ricerca produrrebbe hub sporchi; costruire l'elenco solo col
 * matcher richiederebbe di scaricare l'intero archivio a ogni rigenerazione.
 * Quindi: la ricerca porta i candidati, il matcher decide.
 */

/** Pagine di risultati richieste per ogni termine di ricerca del topic. */
const HUB_SEARCH_PAGES = 2;
/** Risultati per pagina. Con ~50% di scarto servono per arrivare a un hub pieno. */
const HUB_SEARCH_PER_PAGE = 40;

export interface TopicHubData {
  /** Articoli che parlano davvero dell'argomento, dal più recente. */
  articles: PostListItem[];
  /**
   * Percorso della scheda nel database Compatibilità, se esiste davvero.
   *
   * `null` quando il registry dichiara un collegamento a uno slug non ancora
   * inserito: meglio nessun blocco che un link a un 404. Il giorno in cui la
   * scheda viene creata il collegamento compare da sé, senza toccare il codice.
   */
  compatibilityHref: string | null;
}

/**
 * Articoli dell'argomento.
 *
 * `pages` esiste per la sitemap, che deve solo sapere se l'hub supera la soglia
 * di indicizzazione e non ha motivo di scaricare il doppio dei risultati.
 */
export async function loadTopicArticles(
  topic: Topic,
  options: { pages?: number } = {},
): Promise<PostListItem[]> {
  const pages = options.pages ?? HUB_SEARCH_PAGES;
  const terms = topicSearchTerms(topic);

  const requests: Array<Promise<{ posts: PostListItem[] }>> = [];
  for (const term of terms) {
    for (let page = 1; page <= pages; page += 1) {
      requests.push(
        fetchSearchPosts({ query: term, page, perPage: HUB_SEARCH_PER_PAGE }).catch(() => ({
          posts: [] as PostListItem[],
        })),
      );
    }
  }

  const results = await Promise.all(requests);

  const byId = new Map<number, PostListItem>();
  for (const { posts } of results) {
    for (const post of posts) {
      if (byId.has(post.id)) continue;
      // Il filtro di precisione. Lavora su titolo ed excerpt perché è ciò che le
      // liste trasportano: `lib/api` toglie `content` dai `PostListItem` per non
      // gonfiare il payload RSC, e riscaricarlo per ogni candidato costerebbe
      // decine di richieste per hub.
      if (!matchesTopic({ title: post.title, excerpt: post.excerpt }, topic)) continue;
      byId.set(post.id, post);
    }
  }

  return [...byId.values()].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

/** Verifica che la scheda dichiarata nel registry esista nel database. */
async function resolveCompatibilityHref(topic: Topic): Promise<string | null> {
  const link = topic.compatibility;
  if (!link) return null;

  const cachePolicy = { revalidate: COMPATIBILITY_LIST_REVALIDATE_S } as const;
  try {
    if (link.kind === "device") {
      const devices = await fetchCompatibilityDevices(undefined, cachePolicy);
      return devices.some((d) => d.slug === link.slug)
        ? `/compatibility/device/${link.slug}`
        : null;
    }
    const osList = await fetchCompatibilityOsList(cachePolicy);
    return osList.some((os) => os.slug === link.slug) ? `/compatibility/os/${link.slug}` : null;
  } catch (e) {
    // Database non raggiungibile: l'hub resta utile senza il blocco compatibilità.
    console.error(`[TopicHub] verifica compatibilità fallita per ${topic.slug}:`, e);
    return null;
  }
}

export async function loadTopicHub(topic: Topic): Promise<TopicHubData> {
  const [articles, compatibilityHref] = await Promise.all([
    loadTopicArticles(topic),
    resolveCompatibilityHref(topic),
  ]);
  return { articles, compatibilityHref };
}
