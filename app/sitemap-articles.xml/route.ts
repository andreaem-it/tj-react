import { buildArticleEntries } from "@/lib/sitemapEntries";
import { renderSitemapXml, SITEMAP_CACHE_CONTROL } from "@/lib/sitemapXml";

/** `force-dynamic`: con migliaia di post la generazione al build supera il timeout Vercel. */
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const entries = await buildArticleEntries();
  const xml = renderSitemapXml(entries, new Date());

  return new Response(xml, {
    status: 200,
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": SITEMAP_CACHE_CONTROL,
    },
  });
}
