import https from "node:https";
import { unstable_cache } from "next/cache";
import { buildWpTjRequestHeaders, WP_BASE, logApiUrl } from "@/lib/constants";
import { resolveCategoryByUrlSlug } from "@/lib/categorySlugs";
export {
  getCategoryUrlSlug,
  getCategoryUrlSlugFromWpSlug,
  resolveCategoryByUrlSlug,
} from "@/lib/categorySlugs";

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

/**
 * Dati di recensione compilati a mano (§47), da custom field WordPress.
 *
 * Nessun campo qui è calcolato: `rating` è il voto che una persona ha dato
 * dopo un test reale, `pros`/`cons` sono righe scritte a mano. Un post senza
 * voto non ha `review` (il plugin restituisce `null`): l'assenza è
 * l'informazione corretta, non un dato mancante da riempire con un default.
 */
export interface PostReview {
  rating: number;
  ratingScale: number;
  pros: string[];
  cons: string[];
  testDuration: string | null;
  methodology: string | null;
  verdict: string | null;
}

/**
 * Voce di cronologia aggiornamenti (§19, §35-36), da custom field WordPress
 * `tj_changelog` (una riga `AAAA-MM-GG: nota` per voce).
 *
 * `modified` (già su `PostWithMeta`) dice *che* il contenuto è cambiato;
 * questo dice *cosa* — ma solo se qualcuno lo ha scritto. Un articolo senza
 * `tj_changelog` compilato non ha changelog: mostra solo `modified`, come
 * sempre.
 */
export interface ChangelogEntry {
  /** `AAAA-MM-GG`. */
  date: string;
  note: string;
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
  /** Slug WordPress dell'autore, per `/autore/[slug]` (§40). Assente finché il plugin non è aggiornato, come `modified`. */
  authorSlug?: string;
  viewCount: number | null;
  /** Presente solo se il post ha un voto compilato a mano (§47). */
  review?: PostReview | null;
  /** Vuoto se il post non ha una cronologia compilata a mano (§19). */
  changelog?: ChangelogEntry[];
  /**
   * TL;DR (§14): 3-5 punti chiave, da custom field WordPress `tj_tldr`.
   * Generato una sola volta dall'autoposter e persistito — non ricalcolato a
   * ogni richiesta. Vuoto per articoli senza TL;DR compilato.
   */
  tldr?: string[];
  /**
   * Breaking news (§12), da custom field WordPress `tj_breaking_*`.
   * `null`/assente per la stragrande maggioranza degli articoli — è lo stato
   * normale, non un dato mancante. Vedi `lib/home/overrides.ts` per come si
   * trasforma in una voce di `BreakingEntry` e come si sceglie quale mostrare.
   */
  breaking?: { kind: "breaking" | "live"; expiresAt: string; priority: number | null } | null;
}

/**
 * Post così come compare in una lista (griglie, sidebar, correlati, ricerca).
 *
 * Volutamente privo di `content` e `link`: nessuna card li usa, ma finivano
 * comunque serializzati nel payload RSC di ogni pagina, perché le liste sono
 * passate come props a Client Components (`PostsGrid`, `HomeRankingsSidebar`,
 * `RelatedArticlesSlider`). Misurato prima della rimozione: 88 KB su 276 KB di
 * HTML in home erano corpi di articoli mai renderizzati.
 *
 * Il contenuto integrale resta disponibile dove serve davvero — la pagina
 * articolo — via `fetchPostBySlugDetailed`, che restituisce `PostWithMeta`.
 */
export type PostListItem = Omit<PostWithMeta, "content" | "link">;

/**
 * Campi che l'API espone in lista ma che nessun consumatore di lista legge.
 * Rimossi qui, alla sorgente, invece che in ogni componente.
 */
function toListItem(post: PostWithMeta): PostListItem {
  // Copia + delete (anziché destructuring) così un nuovo campo aggiunto a
  // `PostWithMeta` continua a propagarsi alle liste senza modifiche qui.
  const item: Partial<PostWithMeta> = { ...post };
  delete item.content;
  delete item.link;
  return item as PostListItem;
}

/** Risposta tj/v1/posts, già alleggerita (vedi `toListItem`). */
interface TjPostsResponse {
  posts: PostListItem[];
  totalPages: number;
}

/**
 * Esito di un fetch lista post: `error: true` distingue un errore upstream
 * (timeout, HTTP ≥ 400) da una lista realmente vuota.
 */
export interface TjPostsResult extends TjPostsResponse {
  error?: true;
}

/** Risposta tj/v1/home, già alleggerita (vedi `toListItem`). */
interface TjHomeResponse {
  initial: { posts: PostListItem[]; totalPages: number; pagesConsumed: number };
  offerte: PostListItem[];
  trending: PostListItem[];
  mostRead: PostListItem[];
  weekTrending: PostListItem[];
  monthTrending: PostListItem[];
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
): Promise<{ posts: PostListItem[]; totalPages: number }> {
  const params = new URLSearchParams({
    per_page: String(perPage),
    page: String(page),
  });
  if (categoryId != null && categoryId > 0) {
    params.set("category", String(categoryId));
  }
  const url = `${WP_BASE}/posts?${params.toString()}`;
  return fetchTjWithNodeHttps<{ posts?: PostWithMeta[]; totalPages?: number }>(url).then(
    (data) => ({
      posts: (data.posts ?? []).map(toListItem),
      totalPages: data.totalPages ?? 1,
    })
  );
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
  authorSlug?: string;
  requestCache?: RequestCache;
}): Promise<TjPostsResult> {
  const {
    perPage = 10,
    page = 1,
    category,
    categoryIds,
    after,
    search,
    authorSlug,
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
  if (authorSlug) searchParams.set("author", authorSlug);

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
  // L'upstream espone anche `content`/`link`: alleggeriti subito, prima di
  // entrare in Data Cache e nel payload RSC.
  const data = (await res.json()) as { posts?: PostWithMeta[]; totalPages?: number };
  const headerStr = res.headers.get("X-TJ-Total-Pages");
  const fromHeader =
    headerStr != null && headerStr !== "" ? Number(headerStr) : Number.NaN;
  const totalPages =
    Number.isFinite(fromHeader) && fromHeader >= 1
      ? fromHeader
      : Math.max(1, data.totalPages ?? 1);
  return { posts: (data.posts ?? []).map(toListItem), totalPages };
}

function fetchTjPostsCacheKey(params: {
  perPage?: number;
  page?: number;
  category?: number;
  categoryIds?: number[];
  after?: string;
  search?: string;
  authorSlug?: string;
}): string[] {
  return [
    "tj-posts",
    String(params.perPage ?? 10),
    String(params.page ?? 1),
    String(params.category ?? ""),
    (params.categoryIds ?? []).join(","),
    params.after ?? "",
    params.search ?? "",
    params.authorSlug ?? "",
  ];
}

async function fetchTjPosts(params: {
  perPage?: number;
  page?: number;
  category?: number;
  categoryIds?: number[];
  after?: string;
  search?: string;
  authorSlug?: string;
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
  /** Slug WordPress dell'autore: articoli di `/autore/[slug]` (§40). */
  authorSlug?: string;
  requestCache?: RequestCache;
}): Promise<TjPostsResult> {
  const { perPage = 10, page = 1, categoryId, categoryIds, authorSlug, requestCache } = params;
  const ids = categoryIds ?? (categoryId != null && categoryId > 0 ? [categoryId] : []);

  if (ids.length === 0) {
    return fetchTjPosts({ perPage, page, authorSlug, requestCache });
  }

  if (ids.length === 1) {
    return fetchTjPosts({ perPage, page, category: ids[0], authorSlug, requestCache });
  }

  return fetchTjPosts({ perPage, page, categoryIds: ids, authorSlug, requestCache });
}

/**
 * Numero di articoli di una categoria, figlie incluse.
 *
 * Con `per_page=1` il totale delle pagine coincide con il totale degli
 * articoli, quindi basta leggere l'header senza scaricare alcun contenuto.
 *
 * Ritorna `null` — non 0 — quando l'upstream è in errore: lì `fetchTjPosts`
 * degrada a `totalPages: 1`, e interpretarlo come "categoria da 1 articolo"
 * significherebbe mettere in `noindex` un archivio sano (`/apple`, 1075
 * articoli) al primo blip dell'API. Chi decide l'indicizzazione deve poter
 * distinguere "poche" da "non lo so".
 */
export async function fetchCategoryPostCount(
  categoryId: number,
  categories: WPCategory[],
): Promise<number | null> {
  const categoryIds = getCategoryIdsIncludingChildren(categories, categoryId);
  const { totalPages, error } = await fetchPosts({ perPage: 1, page: 1, categoryIds });
  if (error) return null;
  return totalPages;
}

export async function fetchPostsForInitialDisplay(params: {
  categoryId?: number;
  categories?: WPCategory[];
}): Promise<{ posts: PostListItem[]; totalPages: number; pagesConsumed: number }> {
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

  const all: PostListItem[] = [];
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
}): Promise<PostListItem[]> {
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
}): Promise<PostListItem[]> {
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
            }).catch(() => ({ posts: [] as PostListItem[], totalPages: 1 }))
          )
        )
      : [];

  const seen = new Set<number>();
  const sample: PostListItem[] = [];
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
}): Promise<{ posts: PostListItem[]; totalPages: number }> {
  const { query, page = 1, perPage = 10 } = params;
  const q = String(query).trim();
  if (!q) return { posts: [], totalPages: 0 };
  return fetchTjPosts({ perPage, page, search: q });
}

export async function fetchRelatedPosts(params: {
  baseSlug: string;
  categoryId: number;
  limit?: number;
}): Promise<PostListItem[]> {
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
}): Promise<{ week: PostListItem[]; month: PostListItem[] }> {
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
    // Percorso del singolo articolo: qui `content` serve davvero, quindi si
    // legge la risposta grezza dell'upstream, non la forma alleggerita usata
    // dalle liste.
    const data = (await res.json()) as
      | PostWithMeta
      | { posts?: PostWithMeta[] }
      | null;
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

/** Profilo pubblico di un autore che ha effettivamente pubblicato (§40). */
export interface AuthorProfile {
  name: string;
  slug: string;
  /** Testo `description` del profilo utente WordPress. Stringa vuota se assente. */
  bio: string;
  avatarUrl: string | null;
}

async function fetchAuthorRaw(slug: string): Promise<AuthorProfile | null> {
  const url = `${WP_BASE}/author/${encodeURIComponent(slug)}`;
  logApiUrl(url);
  const res = await fetchWithTimeout(url, {
    headers: buildWpTjRequestHeaders(),
    next: { revalidate: TJ_FETCH_REVALIDATE, tags: ["tj-author", `tj-author:${slug}`] },
  });
  // 404 è una risposta definitiva (autore inesistente, o senza post pubblicati,
  // o — finché il plugin non è aggiornato — la route stessa non esiste):
  // in tutti i casi il profilo non c'è, e va trattato come tale, non come errore.
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`TJ API author HTTP ${res.status}`);
  const data = (await res.json()) as Partial<AuthorProfile> | null;
  if (!data || typeof data.name !== "string" || !data.name.trim()) return null;
  return {
    name: data.name,
    slug: typeof data.slug === "string" && data.slug ? data.slug : slug,
    bio: typeof data.bio === "string" ? data.bio : "",
    avatarUrl: typeof data.avatarUrl === "string" && data.avatarUrl ? data.avatarUrl : null,
  };
}

/**
 * Profilo autore per `/autore/[slug]` e il box "Scritto da" in coda
 * all'articolo (§40).
 *
 * Richiede `GET tj/v1/author/:slug`, non ancora deployato in produzione al
 * momento in cui questa funzione è stata scritta (vedi
 * `scripts/wp-plugin/techjournal-api`): fino al deploy risponde sempre
 * `null` — un 404 legittimo, non un errore — e i chiamanti (`AuthorCard`,
 * la pagina autore) degradano di conseguenza invece di rompersi.
 */
export async function fetchAuthorBySlug(slug: string): Promise<AuthorProfile | null> {
  const raw = typeof slug === "string" ? slug.trim() : "";
  if (!raw) return null;
  try {
    return await unstable_cache(() => fetchAuthorRaw(raw), ["tj-author", raw], {
      revalidate: TJ_FETCH_REVALIDATE,
      tags: ["tj-author", `tj-author:${raw}`],
    })();
  } catch (e) {
    console.error(`[TJ API] fetchAuthorBySlug fallita (${raw}):`, e);
    return null;
  }
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

export async function fetchPostsByCategorySlug(
  slug: string,
  perPage = 5
): Promise<PostListItem[]> {
  const categories = await fetchCategories();
  const cat = resolveCategoryByUrlSlug(categories, slug);
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
        const raw = (await res.json()) as {
          initial?: { posts?: PostWithMeta[]; totalPages?: number; pagesConsumed?: number };
          offerte?: PostWithMeta[];
          trending?: PostWithMeta[];
          mostRead?: PostWithMeta[];
          weekTrending?: PostWithMeta[];
          monthTrending?: PostWithMeta[];
        };
        // Come per `fetchTjPostsDirect`: `content`/`link` via prima della Data
        // Cache, così l'intero batch home resta leggero.
        const list = (posts?: PostWithMeta[]): PostListItem[] =>
          (posts ?? []).map(toListItem);
        return {
          initial: {
            posts: list(raw.initial?.posts),
            totalPages: raw.initial?.totalPages ?? 1,
            pagesConsumed: raw.initial?.pagesConsumed ?? 1,
          },
          offerte: list(raw.offerte),
          trending: list(raw.trending),
          mostRead: list(raw.mostRead),
          weekTrending: list(raw.weekTrending),
          monthTrending: list(raw.monthTrending),
        } satisfies TjHomeResponse;
      },
      ["tj-home"],
      { revalidate: TJ_FETCH_REVALIDATE, tags: ["tj-home"] },
    )();
  } catch {
    return null;
  }
}
