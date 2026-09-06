import { buildTopicEntries } from "@/lib/sitemapEntries";
import { renderSitemapXml, SITEMAP_CACHE_CONTROL } from "@/lib/sitemapXml";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const entries = await buildTopicEntries();
  const xml = renderSitemapXml(entries, new Date());

  return new Response(xml, {
    status: 200,
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": SITEMAP_CACHE_CONTROL,
    },
  });
}
