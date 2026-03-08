import { fetchPosts } from "@/lib/api";
import { getCategoryUrlSlugFromWpSlug } from "@/lib/api";
import { SITE_URL } from "@/lib/constants";

export const revalidate = 3600;

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
  const { posts } = await fetchPosts({ perPage: 50, page: 1 });
  const lastBuild = posts.length > 0 ? new Date(posts[0].date) : new Date();

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
