/**
 * Rendering XML condiviso da sitemap index e sitemap segmentate (§72).
 *
 * Estratto da `app/sitemap.xml/route.ts` quando la sitemap unica è stata
 * divisa in un indice + una sitemap per tipo di contenuto (articoli, topic,
 * compatibilità, Price Radar, pagine): stesso rendering XML, entrate diverse
 * per file.
 */

export type ChangeFrequency = "daily" | "weekly" | "monthly";

export type SitemapEntry = {
  url: string;
  lastModified: Date;
  changeFrequency: ChangeFrequency;
  priority: number;
};

export function dedupeByUrl(entries: SitemapEntry[]): SitemapEntry[] {
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

export function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => XML_ESCAPES[c] ?? c);
}

/** `new Date(...)` su una data malformata dà Invalid Date, e `toISOString()` lancia. */
function toIsoOrFallback(date: Date, fallback: Date): string {
  return Number.isNaN(date.getTime()) ? fallback.toISOString() : date.toISOString();
}

export function renderSitemapXml(entries: SitemapEntry[], fallbackDate: Date): string {
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

export type SitemapIndexEntry = {
  url: string;
  lastModified: Date;
};

export function renderSitemapIndexXml(entries: SitemapIndexEntry[], fallbackDate: Date): string {
  const sitemaps = entries
    .map((e) =>
      [
        "  <sitemap>",
        `    <loc>${escapeXml(e.url)}</loc>`,
        `    <lastmod>${toIsoOrFallback(e.lastModified, fallbackDate)}</lastmod>`,
        "  </sitemap>",
      ].join("\n"),
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps}
</sitemapindex>
`;
}

/** Cache condivisa da tutte le sitemap: la CDN serve la stessa copia per un'ora, la funzione gira al massimo una volta. */
export const SITEMAP_CACHE_CONTROL = "public, s-maxage=3600, stale-while-revalidate=86400";
