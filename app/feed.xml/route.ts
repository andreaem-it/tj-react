import { fetchPosts, getCategoryUrlSlugFromWpSlug } from "@/lib/api";
import { SITE_URL } from "@/lib/constants";
import { postModifiedIso } from "@/lib/postDates";

export const revalidate = 3600;

/** Articoli nel feed (prima pagina API). */
const FEED_POSTS_LIMIT = 100;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const base = SITE_URL.replace(/\/$/, "");
  let posts: Awaited<ReturnType<typeof fetchPosts>>["posts"] = [];
  try {
    const result = await fetchPosts({ perPage: FEED_POSTS_LIMIT, page: 1 });
    posts = result.posts;
  } catch {
    // API irraggiungibile: feed vuoto
  }
  let lastBuildMs = 0;
  for (const post of posts) {
    const m = new Date(postModifiedIso(post)).getTime();
    if (Number.isFinite(m)) lastBuildMs = Math.max(lastBuildMs, m);
  }
  const lastBuild =
    posts.length > 0 && lastBuildMs > 0 ? new Date(lastBuildMs) : new Date();

  const items = posts
    .map((post) => {
      const path = `/${getCategoryUrlSlugFromWpSlug(post.categorySlug)}/${post.slug}`;
      const link = `${base}${path}`;
      const pubDate = new Date(post.date).toUTCString();
      const title = escapeXml(post.title);
      const description = escapeXml(post.excerpt || post.title);
      return `<item>
  <title>${title}</title>
  <link>${link}</link>
  <guid isPermaLink="true">${link}</guid>
  <description>${description}</description>
  <pubDate>${pubDate}</pubDate>
</item>`;
    })
    .join("\n");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>TechJournal</title>
    <link>${base}</link>
    <description>Notizie su Apple, Tech e Gadget</description>
    <language>it</language>
    <lastBuildDate>${lastBuild.toUTCString()}</lastBuildDate>
    <atom:link href="${base}/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
