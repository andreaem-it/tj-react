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

async function fetchPostsPagesBatched(pages: number[]): Promise<PostWithMeta[]> {
  const out: PostWithMeta[] = [];
  for (let i = 0; i < pages.length; i += POST_FETCH_CONCURRENCY) {
    const slice = pages.slice(i, i + POST_FETCH_CONCURRENCY);
    const chunks = await Promise.all(
      slice.map((page) =>
        fetchPosts({
          perPage: POSTS_PER_SITEMAP_PAGE,
          page,
        }).catch(() => ({ posts: [] as PostWithMeta[], totalPages: 1 })),
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
    {
      url: `${base}/politica-editoriale`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/cookie-policy`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/termini`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
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
