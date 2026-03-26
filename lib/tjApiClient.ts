import type { PostWithMeta } from "@/lib/api";
import type { PriceRadarProductListItem } from "@/lib/priceRadar/types";

const DEFAULT_FETCH_TIMEOUT_MS = 10_000;

/**
 * Base pubblica tj-api (browser + SSR). Se assente o vuota → path relativi `/api/...`
 * (stesso origin, proxy Next).
 */
export function getPublicTjApiBaseUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_TJ_API_BASE_URL;
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  if (!t) return null;
  return t.replace(/\/$/, "");
}

function normalizePath(path: string): string {
  if (path.startsWith("/")) return path;
  return `/${path}`;
}

/** Path relativo `/api/...` (solo proxy, nessun host). */
function proxyPathOnly(pathWithQuery: string): string {
  return normalizePath(pathWithQuery);
}

/**
 * URL verso tj-api (`https://…/api/…`) oppure path relativo `/api/…` per il proxy Next.
 */
export function resolvePublicApiUrl(path: string): string {
  const base = getPublicTjApiBaseUrl();
  const p = normalizePath(path);
  if (base) return `${base}${p}`;
  return p;
}

function warnApi(context: string, detail: string): void {
  console.warn(`[tjApiClient] API error (${context}): ${detail}`);
}

function warnFallback(context: string): void {
  console.warn(`[tjApiClient] Fallback to proxy (${context})`);
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), DEFAULT_FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
      credentials: "omit",
    });
  } finally {
    clearTimeout(id);
  }
}

/**
 * Prova prima l’URL risolto (tj-api se configurato), poi il path relativo `/api/...` in caso di
 * errore di rete o timeout. Se non c’è base pubblica, una sola richiesta (già proxy).
 */
async function fetchWithFallback(
  pathWithQuery: string,
  init: RequestInit,
  context: string,
): Promise<Response | null> {
  const primary = resolvePublicApiUrl(pathWithQuery);
  const proxyOnly = proxyPathOnly(pathWithQuery);

  const attempt = async (url: string): Promise<Response | null> => {
    try {
      return await fetchWithTimeout(url, init);
    } catch {
      return null;
    }
  };

  if (primary === proxyOnly) {
    const res = await attempt(primary);
    if (res === null) {
      warnApi(context, "network/timeout");
    }
    return res;
  }

  const first = await attempt(primary);
  if (first !== null) {
    return first;
  }

  warnFallback(context);
  const second = await attempt(proxyOnly);
  if (second === null) {
    warnApi(context, "network/timeout");
  }
  return second;
}

/**
 * Parse JSON senza lanciare: null su errore HTTP, body vuoto o JSON non valido.
 */
async function parseJsonSafe<T>(res: Response | null, context: string): Promise<T | null> {
  if (res === null) {
    return null;
  }
  if (!res.ok) {
    warnApi(context, `HTTP ${res.status}`);
    return null;
  }
  const text = await res.text();
  if (!text.trim()) {
    warnApi(context, "empty body");
    return null;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    warnApi(context, "invalid JSON");
    return null;
  }
}

export interface MegamenuPost {
  slug: string;
  title: string;
  imageUrl: string | null;
  imageAlt: string;
}

export interface PostsPageJson {
  posts: PostWithMeta[];
  totalPages?: number;
}

export interface PriceRadarProductsJson {
  products?: PriceRadarProductListItem[];
}

export interface SocialStatsJson {
  facebook?: { followers: number } | null;
  instagram?: { followers: number } | null;
}

const jsonHeaders: HeadersInit = { Accept: "application/json" };

/** Lista prodotti Price Radar (GET). */
export async function fetchPriceRadarProducts(): Promise<PriceRadarProductsJson> {
  const res = await fetchWithFallback(
    "/api/price-radar/products",
    { headers: jsonHeaders },
    "price-radar products",
  );
  const data = await parseJsonSafe<PriceRadarProductsJson>(
    res,
    "price-radar products",
  );
  return data ?? { products: [] };
}

/** Dettaglio prodotto (GET). */
export async function fetchPriceRadarProduct(
  id: string | number,
): Promise<unknown> {
  const path = `/api/price-radar/products/${encodeURIComponent(String(id))}`;
  const res = await fetchWithFallback(path, { headers: jsonHeaders }, "price-radar product");
  return parseJsonSafe<unknown>(res, "price-radar product");
}

/** Storico prezzi (GET). */
export async function fetchPriceRadarHistory(
  id: string | number,
): Promise<unknown> {
  const path = `/api/price-radar/products/${encodeURIComponent(String(id))}/history`;
  const res = await fetchWithFallback(path, { headers: jsonHeaders }, "price-radar history");
  return parseJsonSafe<unknown>(res, "price-radar history");
}

/** Paginazione homepage / categoria (GET). */
export async function fetchPosts(
  page: number,
  categoryId?: number,
): Promise<PostsPageJson> {
  const qs =
    categoryId != null
      ? `?category=${encodeURIComponent(String(categoryId))}`
      : "";
  const res = await fetchWithFallback(
    `/api/posts/${page}${qs}`,
    { headers: jsonHeaders },
    "posts",
  );
  const data = await parseJsonSafe<PostsPageJson>(res, "posts");
  return data ?? { posts: [], totalPages: 0 };
}

/** Megamenu categoria (GET). In errore restituisce array vuoto (come prima). */
export async function fetchMegamenu(slug: string): Promise<MegamenuPost[]> {
  const path = `/api/megamenu/${encodeURIComponent(slug)}`;
  const res = await fetchWithFallback(path, { headers: jsonHeaders }, "megamenu");
  const data = await parseJsonSafe<unknown>(res, "megamenu");
  if (data === null) return [];
  return Array.isArray(data) ? (data as MegamenuPost[]) : [];
}

/** Statistiche social in homepage (GET). */
export async function fetchSocialStats(options?: {
  refresh?: boolean;
}): Promise<SocialStatsJson | null> {
  const qs = new URLSearchParams();
  if (options?.refresh) qs.set("refresh", "1");
  const query = qs.toString();
  const path = `/api/social-stats${query ? `?${query}` : ""}`;
  const res = await fetchWithFallback(path, { headers: jsonHeaders }, "social-stats");
  return parseJsonSafe<SocialStatsJson>(res, "social-stats");
}

/** Tracciamento click offerta Amazon (POST, fire-and-forget). */
export function postPriceRadarProductClick(productId: number): void {
  const path = `/api/price-radar/products/${encodeURIComponent(String(productId))}/click`;
  void fetchWithFallback(path, { method: "POST", headers: jsonHeaders }, "price-radar click");
}
