import type { MetadataRoute } from "next";
import {
  fetchPosts,
  fetchCategories,
  getCategoryUrlSlugFromWpSlug,
  getCategoryUrlSlug,
  type PostWithMeta,
} from "@/lib/api";
import { postModifiedIso } from "@/lib/postDates";
import { SITE_URL } from "@/lib/constants";
import { fetchSitemapJson } from "@/lib/sitemapFetch";

/**
 * Nessuna pre-generazione al build: su Vercel la sitemap superava il timeout (60s) con molte pagine API.
 * La route viene calcolata on-demand e può essere messa in cache dal CDN del provider.
 */
export const dynamic = "force-dynamic";

const POSTS_PER_SITEMAP_PAGE = 100;
/** Limite di sicurezza se l’API restituisce totalPages errato (max ~5M URL teorici; Google consiglia max 50k per file). */
const MAX_POST_LIST_PAGES = 500;
/** Parallelismo richieste liste post (riduce tempo totale rispetto al loop sequenziale). */
const POST_FETCH_CONCURRENCY = 8;

function dedupeByUrl(entries: MetadataRoute.Sitemap): MetadataRoute.Sitemap {
  const map = new Map<string, MetadataRoute.Sitemap[number]>();
  for (const e of entries) {
    map.set(e.url, e);
  }
  return [...map.values()];
}

async function fetchPostsPagesBatched(
  pages: number[],
): Promise<PostWithMeta[]> {
  const out: PostWithMeta[] = [];
  for (let i = 0; i < pages.length; i += POST_FETCH_CONCURRENCY) {
    const slice = pages.slice(i, i + POST_FETCH_CONCURRENCY);
    const chunks = await Promise.all(
      slice.map((page) =>
        fetchPosts({
          perPage: POSTS_PER_SITEMAP_PAGE,
          page,
          requestCache: "no-store",
        }).catch(() => ({ posts: [] as PostWithMeta[], totalPages: 1 })),
      ),
    );
    for (const c of chunks) {
      out.push(...c.posts);
    }
  }
  return out;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE_URL.replace(/\/$/, "");
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/search`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${base}/price-radar`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/compatibility`, lastModified: now, changeFrequency: "weekly", priority: 0.85 },
  ];

  let categories: Awaited<ReturnType<typeof fetchCategories>> = [];
  try {
    categories = await fetchCategories();
  } catch {
    // API irraggiungibile
  }
  for (const cat of categories) {
    if (cat.slug === "offerte") continue;
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
      requestCache: "no-store",
    });
    const totalPages = Math.min(MAX_POST_LIST_PAGES, Math.max(1, first.totalPages));
    const pageNumbers =
      totalPages <= 1 ? [1] : [1, ...Array.from({ length: totalPages - 1 }, (_, i) => i + 2)];
    const postsList =
      totalPages <= 1
        ? first.posts
        : [
            ...first.posts,
            ...(await fetchPostsPagesBatched(pageNumbers.slice(1))),
          ];
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

  const [devicesPayload, osPayload, prPayload] = await Promise.all([
    fetchSitemapJson<{ devices?: Array<{ slug?: string }> }>("/api/compatibility/devices"),
    fetchSitemapJson<{ operatingSystems?: Array<{ slug?: string }> }>("/api/compatibility/os"),
    fetchSitemapJson<{ products?: Array<{ asin?: string }> }>(
      "/api/price-radar/products?status=active",
    ),
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

  for (const p of prPayload?.products ?? []) {
    const asin = typeof p.asin === "string" ? p.asin.trim() : "";
    if (asin.length < 5) continue;
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
    { url: `${base}/politica-editoriale`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/cookie-policy`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/termini`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/feed.xml`, lastModified: now, changeFrequency: "daily", priority: 0.35 }
  );

  return dedupeByUrl(entries);
}
