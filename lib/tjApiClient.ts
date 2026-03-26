import type { PostWithMeta } from "@/lib/api";
import { logApiUrl } from "@/lib/constants";
import type { PriceRadarProductListItem } from "@/lib/priceRadar/types";

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

/**
 * URL verso tj-api (`https://…/api/…`) oppure path relativo `/api/…` per il proxy Next.
 */
export function resolvePublicApiUrl(path: string): string {
  const base = getPublicTjApiBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  if (base) return `${base}${p}`;
  return p;
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

async function parseJsonOrThrow<T>(res: Response): Promise<T> {
  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error("Risposta non valida dal server");
  }
  if (!res.ok) {
    const err = data as { error?: string } | null;
    throw new Error(
      typeof err?.error === "string" ? err.error : `Errore HTTP ${res.status}`,
    );
  }
  return data as T;
}

const jsonHeaders: HeadersInit = { Accept: "application/json" };

/** Lista prodotti Price Radar (GET). */
export async function fetchPriceRadarProducts(): Promise<PriceRadarProductsJson> {
  const url = resolvePublicApiUrl("/api/price-radar/products");
  logApiUrl(url);
  const res = await fetch(url, {
    headers: jsonHeaders,
    cache: "no-store",
    credentials: "omit",
  });
  return parseJsonOrThrow<PriceRadarProductsJson>(res);
}

/** Dettaglio prodotto (GET). */
export async function fetchPriceRadarProduct(
  id: string | number,
): Promise<unknown> {
  const url = resolvePublicApiUrl(
    `/api/price-radar/products/${encodeURIComponent(String(id))}`,
  );
  logApiUrl(url);
  const res = await fetch(url, {
    headers: jsonHeaders,
    cache: "no-store",
    credentials: "omit",
  });
  return parseJsonOrThrow<unknown>(res);
}

/** Storico prezzi (GET). */
export async function fetchPriceRadarHistory(
  id: string | number,
): Promise<unknown> {
  const url = resolvePublicApiUrl(
    `/api/price-radar/products/${encodeURIComponent(String(id))}/history`,
  );
  logApiUrl(url);
  const res = await fetch(url, {
    headers: jsonHeaders,
    cache: "no-store",
    credentials: "omit",
  });
  return parseJsonOrThrow<unknown>(res);
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
  const url = resolvePublicApiUrl(`/api/posts/${page}${qs}`);
  logApiUrl(url);
  const res = await fetch(url, {
    headers: jsonHeaders,
    cache: "no-store",
    credentials: "omit",
  });
  return parseJsonOrThrow<PostsPageJson>(res);
}

/** Megamenu categoria (GET). In errore restituisce array vuoto (come prima). */
export async function fetchMegamenu(slug: string): Promise<MegamenuPost[]> {
  const url = resolvePublicApiUrl(
    `/api/megamenu/${encodeURIComponent(slug)}`,
  );
  const res = await fetch(url, {
    headers: jsonHeaders,
    cache: "force-cache",
    credentials: "omit",
  });
  if (!res.ok) return [];
  const data: unknown = await res.json().catch(() => null);
  return Array.isArray(data) ? (data as MegamenuPost[]) : [];
}

/** Statistiche social in homepage (GET). */
export async function fetchSocialStats(options?: {
  refresh?: boolean;
}): Promise<SocialStatsJson | null> {
  const qs = new URLSearchParams();
  if (options?.refresh) qs.set("refresh", "1");
  qs.set("t", String(Date.now()));
  const url = resolvePublicApiUrl(`/api/social-stats?${qs.toString()}`);
  const res = await fetch(url, {
    cache: "no-store",
    credentials: "omit",
  });
  if (!res.ok) return null;
  return (await res.json()) as SocialStatsJson;
}

/** Tracciamento click offerta Amazon (POST, fire-and-forget). */
export function postPriceRadarProductClick(productId: number): void {
  const url = resolvePublicApiUrl(
    `/api/price-radar/products/${encodeURIComponent(String(productId))}/click`,
  );
  void fetch(url, {
    method: "POST",
    cache: "no-store",
    credentials: "omit",
  });
}
