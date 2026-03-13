import type { MetadataRoute } from "next";
import { fetchPosts, fetchCategories, getCategoryUrlSlugFromWpSlug, getCategoryUrlSlug } from "@/lib/api";
import { SITE_URL } from "@/lib/constants";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE_URL.replace(/\/$/, "");
  const entries: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${base}/search`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.5 },
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
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.8,
    });
  }

  let page = 1;
  let totalPages = 1;
  try {
  do {
    const { posts, totalPages: tp } = await fetchPosts({ perPage: 100, page });
    totalPages = tp;
    for (const post of posts) {
      const path = `/${getCategoryUrlSlugFromWpSlug(post.categorySlug)}/${post.slug}`;
      entries.push({
        url: `${base}${path}`,
        lastModified: new Date(post.date),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      });
    }
    page += 1;
  } while (page <= totalPages);
  } catch {
    // API irraggiungibile: sitemap senza post
  }

  entries.push(
    { url: `${base}/chi-siamo`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.4 },
    { url: `${base}/contatti`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.4 },
    { url: `${base}/privacy`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.3 },
    { url: `${base}/cookie-policy`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.3 },
    { url: `${base}/termini`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.3 }
  );

  return entries;
}
