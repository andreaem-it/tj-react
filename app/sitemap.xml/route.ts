import { SITE_URL } from "@/lib/constants";
import { renderSitemapIndexXml, SITEMAP_CACHE_CONTROL } from "@/lib/sitemapXml";

/**
 * Sitemap index (§72): elenca le sitemap segmentate per tipo di contenuto
 * invece di una sitemap unica con tutto dentro.
 *
 * Prima di questa divisione, `sitemap.xml` costruiva in una sola richiesta
 * articoli, topic, compatibilità, Price Radar e pagine istituzionali — la
 * funzione più lenta (paginazione degli articoli) determinava il tempo di
 * risposta di tutte le altre, e un errore upstream su un tipo di contenuto
 * poteva svuotare l'intera sitemap invece del solo segmento coinvolto. Ogni
 * sitemap segmentata ora fallisce (o è lenta) per conto proprio.
 *
 * Route handler (non `sitemap.ts`) per poter impostare `Cache-Control`,
 * stesso motivo delle sitemap segmentate.
 */
export const dynamic = "force-dynamic";

const SEGMENTS = [
  "sitemap-pages.xml",
  "sitemap-articles.xml",
  "sitemap-topics.xml",
  "sitemap-compatibility.xml",
  "sitemap-price-radar.xml",
] as const;

export async function GET(): Promise<Response> {
  const base = SITE_URL.replace(/\/$/, "");
  const now = new Date();
  const entries = SEGMENTS.map((path) => ({ url: `${base}/${path}`, lastModified: now }));
  const xml = renderSitemapIndexXml(entries, now);

  return new Response(xml, {
    status: 200,
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": SITEMAP_CACHE_CONTROL,
    },
  });
}
