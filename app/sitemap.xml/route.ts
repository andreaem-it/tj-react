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

/**
 * Route handler (non `sitemap.ts`) per poter impostare `Cache-Control`.
 *
 * `force-dynamic` resta necessario: con migliaia di post la generazione al build
 * supera il timeout Vercel (60s). Prima però `revalidate` era affiancato a
 * `force-dynamic`, che lo annulla — quindi *non* c'era alcun ISR e la sitemap
 * veniva rigenerata a ogni singola richiesta di crawler. Con `s-maxage` la CDN
 * serve la stessa copia per un'ora e la funzione gira al massimo una volta.
 */
export const dynamic = "force-dynamic";

const CACHE_CONTROL = "public, s-maxage=3600, stale-while-revalidate=86400";

const POSTS_PER_SITEMAP_PAGE = 100;
/** Limite di sicurezza se l’API restituisce totalPages errato (max ~5M URL teorici; Google consiglia max 50k per file). */
const MAX_POST_LIST_PAGES = 500;
/** Parallelismo richieste liste post (riduce tempo totale rispetto al loop sequenziale). */
const POST_FETCH_CONCURRENCY = 8;

type ChangeFrequency = "daily" | "weekly" | "monthly";

type SitemapEntry = {
  url: string;
  lastModified: Date;
  changeFrequency: ChangeFrequency;
  priority: number;
};

function dedupeByUrl(entries: SitemapEntry[]): SitemapEntry[] {
  const map = new Map<string, SitemapEntry>();
  for (const e of entries) {
    map.set(e.url, e);
  }
  return [...map.values()];
}

const XML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => XML_ESCAPES[c] ?? c);
}

/** `new Date(...)` su una data malformata dà Invalid Date, e `toISOString()` lancia. */
function toIsoOrFallback(date: Date, fallback: Date): string {
  return Number.isNaN(date.getTime()) ? fallback.toISOString() : date.toISOString();
}

function renderSitemapXml(entries: SitemapEntry[], fallbackDate: Date): string {
  const urls = entries
    .map((e) =>
      [
        "  <url>",
        `    <loc>${escapeXml(e.url)}</loc>`,
        `    <lastmod>${toIsoOrFallback(e.lastModified, fallbackDate)}</lastmod>`,
        `    <changefreq>${e.changeFrequency}</changefreq>`,
        `    <priority>${e.priority}</priority>`,
        "  </url>",
      ].join("\n"),
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
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

async function buildSitemapEntries(): Promise<SitemapEntry[]> {
  const base = SITE_URL.replace(/\/$/, "");
  const now = new Date();
  const entries: SitemapEntry[] = [
    { url: base, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/price-radar`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/compatibility`, lastModified: now, changeFrequency: "weekly", priority: 0.85 },
    { url: `${base}/topic`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
  ];

  /**
   * Hub di argomento, con lo stesso criterio applicato agli archivi di
   * categoria: entra in sitemap solo ciò che la pagina serve come indicizzabile.
   *
   * Basta una pagina di risultati per termine: qui serve solo sapere se l'hub
   * supera `MIN_ARTICLES_FOR_INDEXABLE_HUB`, non comporre la pagina. Le richieste
   * passano dalla stessa Data Cache degli hub, quindi in condizioni normali sono
   * cache hit.
   */
  const hubArticleCounts = await Promise.all(
    HUB_TOPICS.map(async (topic) => {
      const articles = await loadTopicArticles(topic, { pages: 1 }).catch(() => []);
      return { topic, count: articles.length, latest: articles[0]?.date };
    }),
  );

  for (const { topic, count, latest } of hubArticleCounts) {
    if (count < MIN_ARTICLES_FOR_INDEXABLE_HUB) continue;
    const lastModified = latest ? new Date(latest) : now;
    entries.push({
      url: `${base}/topic/${topic.slug}`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.8,
    });
  }

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
      url: `${base}/${urlSlug}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    });
  }

  try {
    const first = await fetchPosts({
      perPage: POSTS_PER_SITEMAP_PAGE,
      page: 1,
    });
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
        url: `${base}${path}`,
        lastModified: new Date(postModifiedIso(post)),
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  } catch {
    // API irraggiungibile: sitemap senza post
  }

  const [devicesPayload, osPayload, indexableProductAsins] = await Promise.all([
    fetchSitemapJson<{ devices?: Array<{ slug?: string }> }>("/api/compatibility/devices"),
    fetchSitemapJson<{ operatingSystems?: Array<{ slug?: string }> }>("/api/compatibility/os"),
    // Non l'elenco grezzo dei prodotti: solo quelli la cui pagina è
    // indicizzabile. Prima entravano tutti, e ognuno puntava a un segnaposto
    // identico agli altri.
    getIndexableProductAsins().catch(() => new Set<string>()),
  ]);

  for (const d of devicesPayload?.devices ?? []) {
    const slug = typeof d.slug === "string" ? d.slug.trim() : "";
    if (!slug) continue;
    entries.push({
      url: `${base}/compatibility/device/${encodeURIComponent(slug)}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.75,
    });
  }

  for (const os of osPayload?.operatingSystems ?? []) {
    const slug = typeof os.slug === "string" ? os.slug.trim() : "";
    if (!slug) continue;
    entries.push({
      url: `${base}/compatibility/os/${encodeURIComponent(slug)}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.75,
    });
  }

  for (const asin of indexableProductAsins) {
    entries.push({
      url: `${base}/price-radar/${encodeURIComponent(asin)}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.65,
    });
  }

  entries.push({
    url: `${base}/docs`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.35,
  });

  entries.push(
    { url: `${base}/chi-siamo`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/contatti`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/lavora-con-noi`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    {
      url: `${base}/politica-editoriale`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    // /cookie-policy e /termini NON vanno qui: sono redirect puri (verso
    // /privacy e /chi-siamo). Dichiarare URL che rispondono 3xx spreca crawl
    // budget ed è la segnalazione "Incorrect pages found in sitemap.xml"
    // dell'audit Semrush del 2026-07-10.
  );

  return dedupeByUrl(entries);
}

export async function GET(): Promise<Response> {
  const entries = await buildSitemapEntries();
  const xml = renderSitemapXml(entries, new Date());

  return new Response(xml, {
    status: 200,
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": CACHE_CONTROL,
    },
  });
}
