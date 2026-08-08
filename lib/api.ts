import https from "node:https";
import { unstable_cache } from "next/cache";
import { buildWpTjRequestHeaders, WP_BASE, logApiUrl } from "@/lib/constants";

/**
 * TTL Data Cache / ISR. Alzato da 300s da quando il webhook di pubblicazione
 * invalida on-demand (`lib/cacheInvalidation.ts`): la freschezza arriva
 * dall'evento, non dallo scadere del tempo. Resta come rete di sicurezza se il
 * webhook non è configurato o fallisce.
 */
export const TJ_FETCH_REVALIDATE = 3600;

/**
 * TTL del fetch del *singolo* articolo, volutamente più corto.
 *
 * Liste e home sono invalidate dal webhook alla pubblicazione, quindi possono
 * permettersi 3600s. Il contenuto di un articolo cambia però anche per
 * modifiche successive, che **non** generano alcun webhook: se questo fetch
 * usasse 3600s, il `revalidate = 900` della pagina articolo sarebbe inefficace,
 * perché a ogni rigenerazione troverebbe comunque dati vecchi in Data Cache.
 */
export const TJ_POST_FETCH_REVALIDATE = 900;

/** Tag di cache del singolo articolo, invalidabile per slug dal webhook. */
export function postCacheTag(slug: string): string {
  return `tj-post:${slug}`;
}

export interface WPCategory {
  id: number;
  name: string;
  slug: string;
  link: string;
  taxonomy: string;
  parent?: number;
}

export interface PostWithMeta {
  id: number;
  date: string;
  /** Ultima modifica (ISO 8601). Esposto dal plugin WP `tj/v1`; assente finché il plugin non è aggiornato. */
  modified?: string;
  slug: string;
  link: string;
  title: string;
  excerpt: string;
  content: string;
  categoryName: string;
  categorySlug: string;
  categoryId: number;
  imageUrl: string | null;
  imageAlt: string;
  authorName: string;
  authorAvatarUrl: string | null;
  viewCount: number | null;
}

/** Risposta tj/v1/posts */
interface TjPostsResponse {
  posts: PostWithMeta[];
  totalPages: number;
}

/**
 * Esito di un fetch lista post: `error: true` distingue un errore upstream
 * (timeout, HTTP ≥ 400) da una lista realmente vuota.
 */
export interface TjPostsResult extends TjPostsResponse {
  error?: true;
}

/** Risposta tj/v1/home */
interface TjHomeResponse {
  initial: { posts: PostWithMeta[]; totalPages: number; pagesConsumed: number };
  offerte: PostWithMeta[];
  trending: PostWithMeta[];
  mostRead: PostWithMeta[];
  weekTrending: PostWithMeta[];
  monthTrending: PostWithMeta[];
}

/** Fetch tj/v1 via Node https (bypass cache Next.js, per Load more). */
function fetchTjWithNodeHttps<T>(url: string): Promise<T> {
  const REQUEST_TIMEOUT_MS = 8_000;
  const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
  logApiUrl(url);
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: "GET",
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        ...buildWpTjRequestHeaders(),
      },
    };
    const req = https.get(opts, (res) => {
        let body = "";
        let bodyBytes = 0;
        res.setEncoding("utf8");
        res.on("data", (chunk: Buffer) => {
          const piece = typeof chunk === "string" ? chunk : chunk.toString();
          body += piece;
          bodyBytes += Buffer.byteLength(piece, "utf8");
          if (bodyBytes > MAX_RESPONSE_BYTES) {
            res.destroy(new Error("TJ API response too large"));
          }
        });
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`TJ API HTTP ${res.statusCode}: ${body.slice(0, 200)}`));
            return;
          }
          try {
            resolve(JSON.parse(body) as T);
          } catch (e) {
            reject(e);
          }
        });
      });
    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      req.destroy(new Error("TJ API request timeout"));
    });
    req.on("error", reject);
  });
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 8_000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Richiede una singola pagina di post a tj/v1. Usato per Load more (route /api/posts/[page]). */
export function fetchPostsPageFromWordPress(
  page: number,
  perPage: number,
  categoryId?: number
): Promise<{ posts: PostWithMeta[]; totalPages: number }> {
  const params = new URLSearchParams({
    per_page: String(perPage),
    page: String(page),
  });
  if (categoryId != null && categoryId > 0) {
    params.set("category", String(categoryId));
  }
  const url = `${WP_BASE}/posts?${params.toString()}`;
  return fetchTjWithNodeHttps<TjPostsResponse>(url).then((data) => ({
    posts: data.posts ?? [],
    totalPages: data.totalPages ?? 1,
  }));
}

/**
 * Restituisce l'ID della categoria e di tutte le sottocategorie (ricorsivo).
 */
export function getCategoryIdsIncludingChildren(
  categories: WPCategory[],
  categoryId: number
): number[] {
  const ids = new Set<number>([categoryId]);
  const byParent = new Map<number, WPCategory[]>();
  for (const c of categories) {
    const p = Number(c.parent) || 0;
    if (!byParent.has(p)) byParent.set(p, []);
    byParent.get(p)!.push(c);
  }
  function addChildren(pid: number) {
    for (const c of byParent.get(pid) ?? []) {
      const cid = Number(c.id);
      if (ids.has(cid)) continue;
      ids.add(cid);
      addChildren(cid);
    }
  }
  addChildren(categoryId);
  return Array.from(ids);
}

async function fetchTjPostsDirect(params: {
  perPage?: number;
  page?: number;
  category?: number;
  categoryIds?: number[];
  after?: string;
  search?: string;
  requestCache?: RequestCache;
}): Promise<TjPostsResult> {
  const {
    perPage = 10,
    page = 1,
    category,
    categoryIds,
    after,
    search,
    requestCache,
  } = params;
  const searchParams = new URLSearchParams({
    per_page: String(perPage),
    page: String(page),
  });
  if (category != null && category > 0) {
    searchParams.set("category", String(category));
  } else if (categoryIds?.length) {
    searchParams.set("category_ids", categoryIds.join(","));
  }
  if (after) searchParams.set("after", after);
  if (search) searchParams.set("search", search);

  const url = `${WP_BASE}/posts?${searchParams.toString()}`;
  logApiUrl(url);
  let res: Response;
  try {
    res = await fetchWithTimeout(url, {
      headers: buildWpTjRequestHeaders(),
      ...(requestCache !== undefined && { cache: requestCache }),
      ...(requestCache === undefined && { next: { revalidate: TJ_FETCH_REVALIDATE } }),
    });
  } catch (e) {
    console.error(`[TJ API] fetchTjPosts errore di rete/timeout (${url}):`, e);
    return { posts: [], totalPages: 1, error: true };
  }
  if (!res.ok) {
    const cfHint =
      res.status === 403
        ? " — probabile blocco Cloudflare/WAF su IP datacenter (Vercel); verifica WP_TJ_BYPASS_TOKEN"
        : "";
    console.error(`[TJ API] fetchTjPosts HTTP ${res.status}${cfHint} (${url})`);
    return { posts: [], totalPages: 1, error: true };
  }
  const data = (await res.json()) as TjPostsResponse;
  const headerStr = res.headers.get("X-TJ-Total-Pages");
  const fromHeader =
    headerStr != null && headerStr !== "" ? Number(headerStr) : Number.NaN;
  const totalPages =
    Number.isFinite(fromHeader) && fromHeader >= 1
      ? fromHeader
      : Math.max(1, data.totalPages ?? 1);
  return { posts: data.posts ?? [], totalPages };
}

function fetchTjPostsCacheKey(params: {
  perPage?: number;
  page?: number;
  category?: number;
  categoryIds?: number[];
  after?: string;
  search?: string;
}): string[] {
  return [
    "tj-posts",
    String(params.perPage ?? 10),
    String(params.page ?? 1),
    String(params.category ?? ""),
    (params.categoryIds ?? []).join(","),
    params.after ?? "",
    params.search ?? "",
  ];
}

async function fetchTjPosts(params: {
  perPage?: number;
  page?: number;
  category?: number;
  categoryIds?: number[];
  after?: string;
  search?: string;
  requestCache?: RequestCache;
}): Promise<TjPostsResult> {
  const { requestCache, ...cacheParams } = params;

  // Cache esplicita del client (es. no-store su Load more): bypass unstable_cache.
  if (requestCache !== undefined) {
    return fetchTjPostsDirect({ ...cacheParams, requestCache });
  }

  try {
    return await unstable_cache(
      async () => {
        const result = await fetchTjPostsDirect(cacheParams);
        if (result.error) throw new Error("upstream");
        return result;
      },
      fetchTjPostsCacheKey(cacheParams),
      { revalidate: TJ_FETCH_REVALIDATE, tags: ["tj-posts"] },
    )();
  } catch {
    return { posts: [], totalPages: 1, error: true };
  }
}

/** Numero di post da caricare in iniziale (hero + griglia). */
const INITIAL_POSTS_TARGET = 16;

export async function fetchPosts(params: {
  perPage?: number;
  page?: number;
  categoryId?: number;
  categoryIds?: number[];
  requestCache?: RequestCache;
}): Promise<TjPostsResult> {
  const { perPage = 10, page = 1, categoryId, categoryIds, requestCache } = params;
  const ids = categoryIds ?? (categoryId != null && categoryId > 0 ? [categoryId] : []);

  if (ids.length === 0) {
    return fetchTjPosts({ perPage, page, requestCache });
  }

  if (ids.length === 1) {
    return fetchTjPosts({ perPage, page, category: ids[0], requestCache });
  }

  return fetchTjPosts({ perPage, page, categoryIds: ids, requestCache });
}

export async function fetchPostsForInitialDisplay(params: {
  categoryId?: number;
  categories?: WPCategory[];
}): Promise<{ posts: PostWithMeta[]; totalPages: number; pagesConsumed: number }> {
  const { categoryId, categories } = params;
  const categoryIds =
    categoryId != null && categories?.length
      ? getCategoryIdsIncludingChildren(categories, categoryId)
      : undefined;

  if (categoryIds && categoryIds.length > 1) {
    const { posts, totalPages } = await fetchTjPosts({
      perPage: INITIAL_POSTS_TARGET,
      page: 1,
      categoryIds,
    });
    return {
      posts: posts.slice(0, INITIAL_POSTS_TARGET),
      totalPages: Math.max(1, totalPages),
      pagesConsumed: 1,
    };
  }

  const all: PostWithMeta[] = [];
  let page = 1;
  let totalPages = 1;
  const PER_PAGE = 10;

  while (all.length < INITIAL_POSTS_TARGET) {
    const { posts, totalPages: tp } = await fetchPosts({
      perPage: PER_PAGE,
      page,
      categoryIds: categoryIds ?? (categoryId != null ? [categoryId] : undefined),
    });
    totalPages = tp;
    if (posts.length === 0) break;
    all.push(...posts);
    if (all.length >= INITIAL_POSTS_TARGET) break;
    if (page >= totalPages) break;
    page += 1;
  }

  return {
    posts: all.slice(0, INITIAL_POSTS_TARGET),
    totalPages,
    pagesConsumed: page,
  };
}

/** Numero di post da mostrare nel megamenu. */
export const MEGAMENU_POSTS_TARGET = 5;

export async function fetchPostsForMegamenu(params: {
  categoryId?: number;
  categories?: WPCategory[];
}): Promise<PostWithMeta[]> {
  const { categoryId, categories } = params;
  const categoryIds =
    categoryId != null && categories
      ? getCategoryIdsIncludingChildren(categories, categoryId)
      : undefined;
  const { posts } = await fetchTjPosts({
    perPage: MEGAMENU_POSTS_TARGET,
    page: 1,
    categoryIds: categoryIds ?? (categoryId != null ? [categoryId] : undefined),
  });
  return posts.slice(0, MEGAMENU_POSTS_TARGET);
}

/** Fetch megamenu direttamente da tj/v1 (slug categoria, es. apple, apps). */
export async function fetchMegamenuFromTj(slug: string): Promise<
  Array<{ slug: string; title: string; imageUrl: string | null; imageAlt: string }>
> {
  const url = `${WP_BASE}/megamenu/${encodeURIComponent(slug)}`;
  logApiUrl(url);
  const res = await fetchWithTimeout(url, {
    headers: buildWpTjRequestHeaders(),
    next: { revalidate: 300 },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as Array<{
    slug: string;
    title: string;
    imageUrl: string | null;
    imageAlt: string;
  }>;
  return Array.isArray(data) ? data : [];
}

/**
 * Campione per la classifica "più letti": tj-api non espone un endpoint
 * top-by-views (verificato: wordpress-content ha solo GET/POST /views/:postId),
 * quindi l'ordinamento per visualizzazioni avviene qui su un campione delle
 * pagine più recenti.
 *
 * Limite noto: solo gli ultimi MOST_READ_SAMPLE_PAGES × MOST_READ_SAMPLE_PER_PAGE
 * post possono entrare in classifica; articoli più vecchi ma molto letti
 * restano esclusi finché il backend non espone un ranking server-side.
 */
const MOST_READ_SAMPLE_PAGES = 3;
const MOST_READ_SAMPLE_PER_PAGE = 40;

export async function fetchMostReadPosts(params: {
  categoryId?: number;
  limit?: number;
}): Promise<PostWithMeta[]> {
  const { categoryId, limit = 5 } = params;
  const first = await fetchTjPosts({
    perPage: MOST_READ_SAMPLE_PER_PAGE,
    page: 1,
    category: categoryId ?? undefined,
  });
  if (first.error) return [];
  const pagesToFetch = Math.min(MOST_READ_SAMPLE_PAGES, Math.max(1, first.totalPages));
  const rest =
    pagesToFetch > 1
      ? await Promise.all(
          Array.from({ length: pagesToFetch - 1 }, (_, i) =>
            fetchTjPosts({
              perPage: MOST_READ_SAMPLE_PER_PAGE,
              page: i + 2,
              category: categoryId ?? undefined,
            }).catch(() => ({ posts: [] as PostWithMeta[], totalPages: 1 }))
          )
        )
      : [];

  const seen = new Set<number>();
  const sample: PostWithMeta[] = [];
  for (const { posts } of [first, ...rest]) {
    for (const p of posts) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      sample.push(p);
    }
  }

  sample.sort((a, b) => {
    const va = a.viewCount ?? 0;
    const vb = b.viewCount ?? 0;
    if (vb !== va) return vb - va;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
  return sample.filter((p) => (p.viewCount ?? 0) > 0).slice(0, limit);
}

export async function fetchSearchPosts(params: {
  query: string;
  page?: number;
  perPage?: number;
}): Promise<{ posts: PostWithMeta[]; totalPages: number }> {
  const { query, page = 1, perPage = 10 } = params;
  const q = String(query).trim();
  if (!q) return { posts: [], totalPages: 0 };
  return fetchTjPosts({ perPage, page, search: q });
}

export async function fetchRelatedPosts(params: {
  baseSlug: string;
  categoryId: number;
  limit?: number;
}): Promise<PostWithMeta[]> {
  const { baseSlug, categoryId, limit = 12 } = params;
  const perPage = Math.min(50, limit + 3);
  const { posts } = await fetchTjPosts({ perPage, page: 1, category: categoryId });
  const candidates = posts.filter((p) => p.slug !== baseSlug);
  candidates.sort((a, b) => {
    const va = a.viewCount ?? 0;
    const vb = b.viewCount ?? 0;
    if (vb !== va) return vb - va;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
  return candidates.slice(0, limit);
}

export async function fetchTrendingWeekAndMonth(params: {
  categoryId?: number;
  limit?: number;
}): Promise<{ week: PostWithMeta[]; month: PostWithMeta[] }> {
  const { categoryId, limit = 5 } = params;
  const after = new Date();
  after.setDate(after.getDate() - 30);
  const { posts } = await fetchTjPosts({
    perPage: 40,
    page: 1,
    after: after.toISOString(),
    category: categoryId ?? undefined,
  });
  const sorted = [...posts].sort((a, b) => {
    const va = a.viewCount ?? 0;
    const vb = b.viewCount ?? 0;
    if (vb !== va) return vb - va;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
  const weekCutoff = new Date();
  weekCutoff.setDate(weekCutoff.getDate() - 7);
  const week = sorted.filter((p) => new Date(p.date) >= weekCutoff).slice(0, limit);
  const month = sorted.slice(0, limit);
  return { week, month };
}

function normalizePostAuthor(post: PostWithMeta): PostWithMeta {
  const name =
    typeof post.authorName === "string" && post.authorName.trim().length > 0
      ? post.authorName.trim()
      : "Redazione";
  return name === post.authorName ? post : { ...post, authorName: name };
}

/**
 * Esito del lookup post per slug:
 * - `found`: post esistente;
 * - `not_found`: risposta definitiva dell'upstream (il post non esiste) → 404;
 * - `error`: errore transitorio (timeout, HTTP ≥ 500, JSON non valido) →
 *   il chiamante NON deve trattarlo come 404.
 */
export type PostBySlugResult =
  | { status: "found"; post: PostWithMeta }
  | { status: "not_found" }
  | { status: "error" };

async function fetchPostBySlugFromApi(slug: string): Promise<PostBySlugResult> {
  const raw = typeof slug === "string" ? slug.trim() : "";
  if (!raw) return { status: "not_found" };

  const parsePost = async (res: Response): Promise<PostWithMeta | null> => {
    const data = (await res.json()) as PostWithMeta | TjPostsResponse | null;
    if (!data || typeof data !== "object") return null;
    if ("posts" in data && Array.isArray(data.posts)) {
      const first = data.posts[0];
      return first ? normalizePostAuthor(first) : null;
    }
    if ("slug" in data && typeof (data as PostWithMeta).slug === "string") {
      return normalizePostAuthor(data as PostWithMeta);
    }
    return null;
  };

  // Tag per-slug: senza, `revalidateTag` non raggiungerebbe il singolo articolo
  // e una modifica resterebbe invisibile fino alla scadenza del revalidate.
  // Niente `as const`: `next.tags` deve restare un `string[]` mutabile per RequestInit.
  const fetchOpts: RequestInit = {
    headers: buildWpTjRequestHeaders(),
    next: { revalidate: TJ_POST_FETCH_REVALIDATE, tags: ["tj-post", postCacheTag(raw)] },
  };

  try {
    const urlSingle = `${WP_BASE}/post/${encodeURIComponent(raw)}`;
    logApiUrl(urlSingle);
    const resSingle = await fetchWithTimeout(urlSingle, fetchOpts);
    if (resSingle.ok) {
      try {
        const fromSingle = await parsePost(resSingle);
        if (fromSingle) return { status: "found", post: fromSingle };
      } catch {
        // JSON non valido: tentiamo comunque l'endpoint lista.
      }
    }

    // Fallback endpoint lista: una risposta 200 con lista vuota è la conferma
    // definitiva che il post non esiste (≠ errore upstream).
    const urlList = `${WP_BASE}/posts?${new URLSearchParams({
      slug: raw,
      per_page: "1",
      page: "1",
    }).toString()}`;
    logApiUrl(urlList);
    const resList = await fetchWithTimeout(urlList, fetchOpts);
    if (!resList.ok) return { status: "error" };
    try {
      const fromList = await parsePost(resList);
      // Verifica difensiva: lo slug tornato dal server deve coincidere con quello
      // richiesto (il plugin WP potrebbe ignorare il filtro e restituire un post casuale).
      if (!fromList || fromList.slug !== raw) return { status: "not_found" };
      return { status: "found", post: fromList };
    } catch {
      return { status: "error" };
    }
  } catch {
    return { status: "error" };
  }
}

/**
 * Lookup post per slug con esito tripartito (found / not_found / error),
 * senza cache in-process persistente: evita "cache negativa" dopo errori
 * transitori upstream. Retry singolo solo sugli errori transitori.
 */
export async function fetchPostBySlugDetailed(slug: string): Promise<PostBySlugResult> {
  const firstAttempt = await fetchPostBySlugFromApi(slug);
  if (firstAttempt.status !== "error") return firstAttempt;
  // Retry singolo difensivo contro timeout/network transitori.
  return fetchPostBySlugFromApi(slug);
}

/** Variante compatibile per i call site che non distinguono 404 da errore. */
export async function fetchPostBySlug(slug: string): Promise<PostWithMeta | null> {
  const result = await fetchPostBySlugDetailed(slug);
  return result.status === "found" ? result.post : null;
}

async function fetchCategoriesRaw(): Promise<WPCategory[]> {
  const url = `${WP_BASE}/categories`;
  logApiUrl(url);
  const res = await fetchWithTimeout(url, {
    headers: buildWpTjRequestHeaders(),
    next: { revalidate: 300 },
  });
  // Throw su errore upstream: unstable_cache non memorizza i risultati quando
  // la funzione lancia, quindi un errore transitorio non svuota le categorie
  // (e tutte le pagine categoria) per i 600s di TTL.
  if (!res.ok) {
    throw new Error(`TJ API categories HTTP ${res.status}`);
  }
  const data = (await res.json()) as WPCategory[];
  return Array.isArray(data)
    ? data.filter((c) => c.id !== 1).map((c) => ({
        ...c,
        id: Number(c.id),
        parent: Number(c.parent) || 0,
      }))
    : [];
}

/**
 * Attenzione: `Header` sta nel layout e chiama questa funzione, quindi il suo
 * `revalidate` fa da **tetto al revalidate di ogni pagina del sito** (Next
 * prende il minimo su tutto l'albero di render). Con 600s qui, i 3600s di home
 * e categorie non avevano alcun effetto.
 *
 * Le categorie cambiano molto di rado: TTL lungo più tag per l'invalidazione
 * on-demand dal webhook.
 */
const fetchCategoriesCached = unstable_cache(fetchCategoriesRaw, ["tj-categories"], {
  revalidate: 3600,
  tags: ["tj-categories"],
});

/**
 * Categorie con cache 600s. In caso di errore upstream il fallback `[]` NON
 * viene cacheato: solo la richiesta corrente vede la lista vuota.
 */
export async function fetchCategories(): Promise<WPCategory[]> {
  try {
    return await fetchCategoriesCached();
  } catch (e) {
    console.error("[TJ API] fetchCategories fallita (fallback [] non cacheato):", e);
    return [];
  }
}

/** Mapping slug URL → slug WordPress. */
const URL_SLUG_TO_WP_SLUG: Record<string, string> = {
  apps: "applicazioni",
  gaming: "games",
  tech: "tecnologia",
  ia: "intelligenza-artificiale",
};

const WP_SLUG_TO_URL_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(URL_SLUG_TO_WP_SLUG).map(([url, wp]) => [wp, url])
);

export function getCategoryUrlSlug(cat: WPCategory): string {
  return WP_SLUG_TO_URL_SLUG[cat.slug] ?? cat.slug;
}

export function getCategoryUrlSlugFromWpSlug(wpSlug: string): string {
  return WP_SLUG_TO_URL_SLUG[wpSlug] ?? wpSlug;
}

export function resolveCategoryByUrlSlug(
  categories: WPCategory[],
  urlSlug: string
): WPCategory | undefined {
  const wpSlug = URL_SLUG_TO_WP_SLUG[urlSlug] ?? urlSlug;
  return categories.find((c) => c.slug === wpSlug);
}

export async function fetchPostsByCategorySlug(
  slug: string,
  perPage = 5
): Promise<PostWithMeta[]> {
  const categories = await fetchCategories();
  const wpSlug = URL_SLUG_TO_WP_SLUG[slug] ?? slug;
  const cat = categories.find((c) => c.slug === wpSlug);
  if (!cat) return [];
  const categoryIds = getCategoryIdsIncludingChildren(categories, cat.id);
  const { posts } = await fetchPosts({ perPage, categoryIds });
  return posts;
}

/** Batch home: tutti i dati in una sola chiamata tj/v1/home. */
export async function fetchHome(): Promise<TjHomeResponse | null> {
  try {
    return await unstable_cache(
      async () => {
        const url = `${WP_BASE}/home`;
        logApiUrl(url);
        const res = await fetchWithTimeout(url, {
          headers: buildWpTjRequestHeaders(),
          next: { revalidate: TJ_FETCH_REVALIDATE },
        });
        if (!res.ok) {
          const cfHint =
            res.status === 403
              ? " — probabile blocco Cloudflare/WAF su IP datacenter (Vercel)"
              : "";
          console.error(`[TJ API] fetchHome HTTP ${res.status}${cfHint} (${url})`);
          throw new Error("upstream");
        }
        return (await res.json()) as TjHomeResponse;
      },
      ["tj-home"],
      { revalidate: TJ_FETCH_REVALIDATE, tags: ["tj-home"] },
    )();
  } catch {
    return null;
  }
}
