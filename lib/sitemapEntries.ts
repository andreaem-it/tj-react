/**
 * Costruzione delle entry per le sitemap segmentate (§72): una funzione per
 * tipo di contenuto, così ogni file `app/sitemap-*.xml/route.ts` genera solo
 * quello che gli serve invece di ricostruire l'intero catalogo del sito a
 * ogni richiesta di crawler, indipendentemente da quale sitemap sta
 * leggendo.
 *
 * Estratto da `app/sitemap.xml/route.ts` (prima sitemap unica, ~278 righe di
 * costruzione entry in una funzione sola) senza cambiare nessun criterio di
 * inclusione: stessa logica, solo raggruppata per tipo.
 */

import {
  fetchPosts,
  fetchCategories,
  fetchCategoryPostCount,
  getCategoryUrlSlugFromWpSlug,
  getCategoryUrlSlug,
  type PostListItem,
} from "@/lib/api";
import {
  MIN_ARTICLES_FOR_INDEXABLE_HUB,
  MIN_POSTS_FOR_INDEXABLE_CATEGORY,
} from "@/lib/seo";
import { loadTopicArticles } from "@/lib/content/hubData";
import { getIndexableProductAsins } from "@/lib/priceRadar/productServer";
import { HUB_TOPICS } from "@/lib/content/topics";
import { postModifiedIso } from "@/lib/postDates";
import { SITE_URL } from "@/lib/constants";
import { fetchSitemapJson } from "@/lib/sitemapFetch";
import { dedupeByUrl, type SitemapEntry } from "@/lib/sitemapXml";

const POSTS_PER_SITEMAP_PAGE = 100;
/** Limite di sicurezza se l'API restituisce totalPages errato (max ~5M URL teorici; Google consiglia max 50k per file). */
const MAX_POST_LIST_PAGES = 500;
/** Parallelismo richieste liste post (riduce tempo totale rispetto al loop sequenziale). */
const POST_FETCH_CONCURRENCY = 8;

function base(): string {
  return SITE_URL.replace(/\/$/, "");
}

async function fetchPostsPagesBatched(pages: number[]): Promise<PostListItem[]> {
  const out: PostListItem[] = [];
  for (let i = 0; i < pages.length; i += POST_FETCH_CONCURRENCY) {
    const slice = pages.slice(i, i + POST_FETCH_CONCURRENCY);
    const chunks = await Promise.all(
      slice.map((page) =>
        fetchPosts({
          perPage: POSTS_PER_SITEMAP_PAGE,
          page,
        }).catch(() => ({ posts: [] as PostListItem[], totalPages: 1 })),
      ),
    );
    for (const c of chunks) {
      out.push(...c.posts);
    }
  }
  return out;
}

/** Articoli pubblicati: la sitemap più grande e quella che cambia più spesso. */
export async function buildArticleEntries(): Promise<SitemapEntry[]> {
  const b = base();
  const entries: SitemapEntry[] = [];
  try {
    const first = await fetchPosts({ perPage: POSTS_PER_SITEMAP_PAGE, page: 1 });
    const totalPages = Math.min(MAX_POST_LIST_PAGES, Math.max(1, first.totalPages));
    const pageNumbers =
      totalPages <= 1 ? [1] : [1, ...Array.from({ length: totalPages - 1 }, (_, i) => i + 2)];
    const postsList =
      totalPages <= 1
        ? first.posts
        : [...first.posts, ...(await fetchPostsPagesBatched(pageNumbers.slice(1)))];
    for (const post of postsList) {
      const path = `/${getCategoryUrlSlugFromWpSlug(post.categorySlug)}/${post.slug}`;
      entries.push({
        url: `${b}${path}`,
        lastModified: new Date(postModifiedIso(post)),
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  } catch {
    // API irraggiungibile: sitemap articoli vuota, le altre restano indipendenti.
  }
  return dedupeByUrl(entries);
}

/**
 * Hub di argomento: entra in sitemap solo ciò che la pagina serve come
 * indicizzabile, stesso criterio applicato agli archivi di categoria.
 */
export async function buildTopicEntries(): Promise<SitemapEntry[]> {
  const b = base();
  const now = new Date();
  const entries: SitemapEntry[] = [{ url: `${b}/topic`, lastModified: now, changeFrequency: "weekly", priority: 0.7 }];

  const hubArticleCounts = await Promise.all(
    HUB_TOPICS.map(async (topic) => {
      const articles = await loadTopicArticles(topic, { pages: 1 }).catch(() => []);
      return { topic, count: articles.length, latest: articles[0]?.date };
    }),
  );

  for (const { topic, count, latest } of hubArticleCounts) {
    if (count < MIN_ARTICLES_FOR_INDEXABLE_HUB) continue;
    entries.push({
      url: `${b}/topic/${topic.slug}`,
      lastModified: latest ? new Date(latest) : now,
      changeFrequency: "daily",
      priority: 0.8,
    });
  }

  return dedupeByUrl(entries);
}

/** Dispositivi e sistemi operativi del database Compatibilità. */
export async function buildCompatibilityEntries(): Promise<SitemapEntry[]> {
  const b = base();
  const now = new Date();
  const entries: SitemapEntry[] = [
    { url: `${b}/compatibility`, lastModified: now, changeFrequency: "weekly", priority: 0.85 },
  ];

  const [devicesPayload, osPayload] = await Promise.all([
    fetchSitemapJson<{ devices?: Array<{ slug?: string }> }>("/api/compatibility/devices"),
    fetchSitemapJson<{ operatingSystems?: Array<{ slug?: string }> }>("/api/compatibility/os"),
  ]);

  for (const d of devicesPayload?.devices ?? []) {
    const slug = typeof d.slug === "string" ? d.slug.trim() : "";
    if (!slug) continue;
    entries.push({
      url: `${b}/compatibility/device/${encodeURIComponent(slug)}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.75,
    });
  }

  for (const os of osPayload?.operatingSystems ?? []) {
    const slug = typeof os.slug === "string" ? os.slug.trim() : "";
    if (!slug) continue;
    entries.push({
      url: `${b}/compatibility/os/${encodeURIComponent(slug)}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.75,
    });
  }

  return dedupeByUrl(entries);
}

/** Prodotti Price Radar la cui pagina è davvero indicizzabile (non l'elenco grezzo). */
export async function buildPriceRadarEntries(): Promise<SitemapEntry[]> {
  const b = base();
  const now = new Date();
  const entries: SitemapEntry[] = [
    { url: `${b}/price-radar`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
  ];

  const indexableProductAsins = await getIndexableProductAsins().catch(() => new Set<string>());
  for (const asin of indexableProductAsins) {
    entries.push({
      url: `${b}/price-radar/${encodeURIComponent(asin)}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.65,
    });
  }

  return dedupeByUrl(entries);
}

/** Home, archivi di categoria e pagine istituzionali: tutto ciò che non è articolo, topic, compatibilità o Price Radar. */
export async function buildPageEntries(): Promise<SitemapEntry[]> {
  const b = base();
  const now = new Date();
  const entries: SitemapEntry[] = [
    { url: b, lastModified: now, changeFrequency: "daily", priority: 1 },
  ];

  let categories: Awaited<ReturnType<typeof fetchCategories>> = [];
  try {
    categories = await fetchCategories();
  } catch {
    // API irraggiungibile
  }
  // Conteggi in parallelo: servono a non dichiarare in sitemap archivi che la
  // pagina serve con `noindex`. Dichiararli sarebbe una contraddizione di
  // segnali, e spenderebbe crawl budget su URL che non si vogliono in indice.
  const categoryCounts = new Map<number, number | null>();
  await Promise.all(
    categories.map(async (cat) => {
      const count = await fetchCategoryPostCount(cat.id, categories).catch(() => null);
      categoryCounts.set(cat.id, count);
    }),
  );

  for (const cat of categories) {
    if (cat.slug === "offerte") continue;
    // `null` = conteggio non disponibile: l'URL resta, coerentemente con
    // `generateMetadata`, che in quel caso non applica il noindex.
    const count = categoryCounts.get(cat.id) ?? null;
    if (count !== null && count < MIN_POSTS_FOR_INDEXABLE_CATEGORY) continue;
    const urlSlug = getCategoryUrlSlug(cat);
    entries.push({
      url: `${b}/${urlSlug}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    });
  }

  entries.push({ url: `${b}/docs`, lastModified: now, changeFrequency: "monthly", priority: 0.35 });

  entries.push(
    { url: `${b}/chi-siamo`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${b}/contatti`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${b}/lavora-con-noi`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${b}/politica-editoriale`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${b}/correzioni`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${b}/fonti`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${b}/ai-e-automazione`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${b}/privacy`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    // /cookie-policy e /termini NON vanno qui: sono redirect puri (verso
    // /privacy e /chi-siamo). Dichiarare URL che rispondono 3xx spreca crawl
    // budget ed è la segnalazione "Incorrect pages found in sitemap.xml"
    // dell'audit Semrush del 2026-07-10.
  );

  return dedupeByUrl(entries);
}
