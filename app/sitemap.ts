import type { MetadataRoute } from "next";
import { fetchPosts, fetchCategories, getCategoryUrlSlugFromWpSlug, getCategoryUrlSlug } from "@/lib/api";
import { SITE_URL } from "@/lib/constants";

/** Rigenerazione sitemap (ISR). Gli URL articolo usano fetch senza cache pagina per elenco aggiornato a ogni build della route. */
export const revalidate = 3600;

const POSTS_PER_SITEMAP_PAGE = 100;
/** Limite di sicurezza se l’API restituisce totalPages errato (max ~5M URL teorici; Google consiglia max 50k per file). */
const MAX_POST_LIST_PAGES = 500;

function dedupeByUrl(entries: MetadataRoute.Sitemap): MetadataRoute.Sitemap {
  const map = new Map<string, MetadataRoute.Sitemap[number]>();
  for (const e of entries) {
    map.set(e.url, e);
  }
  return [...map.values()];
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

  let page = 1;
  let totalPages = 1;
  try {
    do {
      const { posts, totalPages: tp } = await fetchPosts({
        perPage: POSTS_PER_SITEMAP_PAGE,
        page,
        requestCache: "no-store",
      });
      totalPages = Math.max(1, tp);
      for (const post of posts) {
        const path = `/${getCategoryUrlSlugFromWpSlug(post.categorySlug)}/${post.slug}`;
        entries.push({
          url: `${base}${path}`,
          lastModified: new Date(post.date),
          changeFrequency: "weekly",
          priority: 0.7,
        });
      }
      if (posts.length === 0) break;
      page += 1;
    } while (page <= totalPages && page <= MAX_POST_LIST_PAGES);
  } catch {
    // API irraggiungibile: sitemap senza post
  }

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
