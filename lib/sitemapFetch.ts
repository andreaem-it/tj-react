import { getTjApiBaseUrl } from "@/lib/config/tjApi";
import { API_REQUEST_HEADERS, SITE_URL } from "@/lib/constants";

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
      const res = await fetch(url, {
        headers: API_REQUEST_HEADERS,
        next: { revalidate: 3600 },
      });
      if (!res.ok) continue;
      return (await res.json()) as T;
    } catch {
      continue;
    }
  }
  return null;
}
