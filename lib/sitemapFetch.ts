import { getTjApiBaseUrl } from "@/lib/config/tjApi";
import { buildWpTjRequestHeaders, SITE_URL } from "@/lib/constants";
import { fetchWithTimeout } from "@/lib/http/fetchWithTimeout";

const SITEMAP_FETCH_TIMEOUT_MS = 10_000;

/**
 * Fetch JSON per costruire la sitemap: preferisce `TJ_API_BASE_URL`, altrimenti il sito pubblico.
 */
export async function fetchSitemapJson<T>(path: string): Promise<T | null> {
  const p = path.startsWith("/") ? path : `/${path}`;
  const origins: string[] = [];
  const tj = getTjApiBaseUrl();
  if (tj) origins.push(tj.replace(/\/$/, ""));
  origins.push(SITE_URL.replace(/\/$/, ""));
  const tried = new Set<string>();
  for (const origin of origins) {
    const url = `${origin}${p}`;
    if (tried.has(url)) continue;
    tried.add(url);
    try {
      // Senza scadenza un'origine lenta bloccava la sitemap invece di far
      // provare l'origine successiva.
      const res = await fetchWithTimeout(
        url,
        { headers: buildWpTjRequestHeaders(), next: { revalidate: 3600 } },
        SITEMAP_FETCH_TIMEOUT_MS,
      );
      if (!res.ok) continue;
      return (await res.json()) as T;
    } catch {
      continue;
    }
  }
  return null;
}
