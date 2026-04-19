import type { PostWithMeta } from "@/lib/api";
import type { PriceRadarProductListItem } from "@/lib/priceRadar/types";

/** Timeout passati a fetchWithFallback dai call site (ms). */
const TIMEOUT_PRICE_RADAR_MS = 5000;
const TIMEOUT_POSTS_MS = 6000;
const TIMEOUT_MEGAMENU_MS = 4000;
const TIMEOUT_SOCIAL_STATS_MS = 10000;
const TIMEOUT_COMPATIBILITY_MS = 15_000;

const WARN_THROTTLE_MS = 5000;

let lastWarnApiAt = 0;
let lastWarnFallbackAt = 0;

function throttledApiWarn(log: () => void): void {
  const now = Date.now();
  if (now - lastWarnApiAt < WARN_THROTTLE_MS) return;
  lastWarnApiAt = now;
  log();
}

function throttledFallbackWarn(log: () => void): void {
  const now = Date.now();
  if (now - lastWarnFallbackAt < WARN_THROTTLE_MS) return;
  lastWarnFallbackAt = now;
  log();
}

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

function isRetriableFetchError(e: unknown): boolean {
  if (e instanceof TypeError) return true;
  if (typeof e === "object" && e !== null && "name" in e) {
    return (e as { name: string }).name === "AbortError";
  }
  return false;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
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
 * Una sola richiesta: fallisce solo su errore di rete / timeout (ritorna null).
 * Se arriva una Response (anche HTTP 5xx), non lancia e non ritorna null.
 */
async function attemptFetch(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response | null> {
  try {
    return await fetchWithTimeout(url, init, timeoutMs);
  } catch (e) {
    if (!isRetriableFetchError(e)) throw e;
    return null;
  }
}

/**
 * Primary → tj-api (se configurato); fallback → proxy una sola volta, solo dopo
 * errore di rete/timeout sulla primary. Mai ricorsione oltre un livello.
 */
async function fetchWithFallback(
  pathWithQuery: string,
  init: RequestInit,
  context: string,
  timeoutMs: number,
  isFallbackAttempt = false,
): Promise<Response | null> {
  const proxyOnly = proxyPathOnly(pathWithQuery);
  const primary = resolvePublicApiUrl(pathWithQuery);

  if (isFallbackAttempt) {
    const res = await attemptFetch(proxyOnly, init, timeoutMs);
    if (res === null) {
      throttledApiWarn(() =>
        console.warn(`[tjApiClient] API error (${context}): network/timeout`),
      );
    }
    return res;
  }

  if (primary === proxyOnly) {
    const res = await attemptFetch(primary, init, timeoutMs);
    if (res === null) {
      throttledApiWarn(() =>
        console.warn(`[tjApiClient] API error (${context}): network/timeout`),
      );
    }
    return res;
  }

  const first = await attemptFetch(primary, init, timeoutMs);
  if (first !== null) {
    return first;
  }

  throttledFallbackWarn(() =>
    console.warn(`[tjApiClient] Fallback to proxy (${context})`),
  );

  return fetchWithFallback(pathWithQuery, init, context, timeoutMs, true);
}

type ParseOutcome<T> =
  | { status: "ok"; data: T }
  | {
      status: "error";
      kind: "no_response" | "http" | "empty" | "parse";
      httpStatus?: number;
    };

async function parseJsonSafe<T>(
  res: Response | null,
  context: string,
): Promise<ParseOutcome<T>> {
  if (res === null) {
    throttledApiWarn(() =>
      console.warn(`[tjApiClient] API error (${context}): no response`),
    );
    return { status: "error", kind: "no_response" };
  }
  if (!res.ok) {
    const st = res.status;
    throttledApiWarn(() =>
      console.warn(`[tjApiClient] API error (${context}): HTTP ${st}`),
    );
    return { status: "error", kind: "http", httpStatus: st };
  }
  const text = await res.text();
  if (!text.trim()) {
    throttledApiWarn(() =>
      console.warn(`[tjApiClient] API error (${context}): empty body`),
    );
    return { status: "error", kind: "empty" };
  }
  try {
    return { status: "ok", data: JSON.parse(text) as T };
  } catch {
    throttledApiWarn(() =>
      console.warn(`[tjApiClient] API error (${context}): invalid JSON`),
    );
    return { status: "error", kind: "parse" };
  }
}

function withInternalError<T extends Record<string, unknown>>(
  base: T,
): T & { _error?: true } {
  return { ...base, _error: true };
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
    "/api/price-radar/products?status=active",
    { headers: jsonHeaders },
    "price-radar products",
    TIMEOUT_PRICE_RADAR_MS,
  );
  const outcome = await parseJsonSafe<PriceRadarProductsJson>(
    res,
    "price-radar products",
  );
  if (outcome.status === "ok") {
    const d = outcome.data;
    if (d != null && typeof d === "object") {
      return d;
    }
    return withInternalError({ products: [] }) as PriceRadarProductsJson;
  }
  return withInternalError({ products: [] }) as PriceRadarProductsJson;
}

/** Dettaglio prodotto (GET). */
export async function fetchPriceRadarProduct(
  id: string | number,
): Promise<unknown> {
  const path = `/api/price-radar/products/${encodeURIComponent(String(id))}`;
  const res = await fetchWithFallback(
    path,
    { headers: jsonHeaders },
    "price-radar product",
    TIMEOUT_PRICE_RADAR_MS,
  );
  const outcome = await parseJsonSafe<unknown>(res, "price-radar product");
  return outcome.status === "ok" ? outcome.data ?? null : null;
}

/** Storico prezzi (GET). */
export async function fetchPriceRadarHistory(
  id: string | number,
): Promise<unknown> {
  const path = `/api/price-radar/products/${encodeURIComponent(String(id))}/history`;
  const res = await fetchWithFallback(
    path,
    { headers: jsonHeaders },
    "price-radar history",
    TIMEOUT_PRICE_RADAR_MS,
  );
  const outcome = await parseJsonSafe<unknown>(res, "price-radar history");
  return outcome.status === "ok" ? outcome.data ?? null : null;
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
    TIMEOUT_POSTS_MS,
  );
  const outcome = await parseJsonSafe<PostsPageJson>(res, "posts");
  if (outcome.status === "ok") {
    const d = outcome.data;
    if (d != null && typeof d === "object") {
      return d;
    }
    return withInternalError({
      posts: [],
      totalPages: 0,
    }) as PostsPageJson;
  }
  return withInternalError({
    posts: [],
    totalPages: 0,
  }) as PostsPageJson;
}

/** Megamenu categoria (GET). In errore restituisce array vuoto (come prima). */
export async function fetchMegamenu(slug: string): Promise<MegamenuPost[]> {
  const path = `/api/megamenu/${encodeURIComponent(slug)}`;
  const res = await fetchWithFallback(
    path,
    { headers: jsonHeaders },
    "megamenu",
    TIMEOUT_MEGAMENU_MS,
  );
  const outcome = await parseJsonSafe<unknown>(res, "megamenu");
  if (outcome.status !== "ok") return [];
  const data = outcome.data;
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
  const res = await fetchWithFallback(
    path,
    { headers: jsonHeaders },
    "social-stats",
    TIMEOUT_SOCIAL_STATS_MS,
  );
  const outcome = await parseJsonSafe<SocialStatsJson>(res, "social-stats");
  return outcome.status === "ok" ? outcome.data ?? null : null;
}

/**
 * GET JSON verso route proxy `/api/*` (stesso meccanismo di `fetchPosts`, megamenu, Price Radar).
 * Usare da Server Component per evitare duplicare `resolvePublicApiUrl` / timeout / fallback.
 */
export async function fetchTjProxyJson<T>(
  path: string,
  context: string,
  timeoutMs: number = TIMEOUT_COMPATIBILITY_MS,
): Promise<T | null> {
  const res = await fetchWithFallback(
    path,
    { headers: jsonHeaders },
    context,
    timeoutMs,
  );
  const outcome = await parseJsonSafe<T>(res, context);
  return outcome.status === "ok" ? outcome.data ?? null : null;
}

/** Tracciamento click offerta Amazon (POST, fire-and-forget). */
export function postPriceRadarProductClick(productId: number): void {
  const path = `/api/price-radar/products/${encodeURIComponent(String(productId))}/click`;
  void fetchWithFallback(
    path,
    { method: "POST", headers: jsonHeaders },
    "price-radar click",
    TIMEOUT_PRICE_RADAR_MS,
  );
}
