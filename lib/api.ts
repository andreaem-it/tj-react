import https from "node:https";
import { unstable_cache } from "next/cache";

const WP_BASE =
  process.env.NEXT_PUBLIC_WP_BASE ?? "https://www.techjournal.it/wp-json/tj/v1";

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
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: "GET",
      headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
    };
    https
      .get(opts, (res) => {
        let body = "";
        res.on("data", (chunk: Buffer) => {
          body += chunk.toString();
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
      })
      .on("error", reject);
  });
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

async function fetchTjPosts(params: {
  perPage?: number;
  page?: number;
  category?: number;
  categoryIds?: number[];
  after?: string;
  search?: string;
  requestCache?: RequestCache;
}): Promise<TjPostsResponse> {
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
  const res = await fetch(url, {
    ...(requestCache !== undefined && { cache: requestCache }),
    ...(requestCache === undefined && { next: { revalidate: 60 } }),
  });
  if (!res.ok) throw new Error(`TJ API error: ${res.status}`);
  const data = (await res.json()) as TjPostsResponse;
  const totalPages =
    Number(res.headers.get("X-TJ-Total-Pages")) ?? data.totalPages ?? 1;
  return { posts: data.posts ?? [], totalPages };
}

/** Numero di post da caricare in iniziale (hero + griglia). */
const INITIAL_POSTS_TARGET = 20;

export async function fetchPosts(params: {
  perPage?: number;
  page?: number;
  categoryId?: number;
  categoryIds?: number[];
  requestCache?: RequestCache;
}): Promise<{ posts: PostWithMeta[]; totalPages: number }> {
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
      totalPages: Math.max(1, Math.ceil(posts.length / 10)),
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
  const res = await fetch(`${WP_BASE}/megamenu/${encodeURIComponent(slug)}`, {
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

export async function fetchPostsWithEmbed(): Promise<PostWithMeta[]> {
  const { posts } = await fetchTjPosts({ perPage: 100, page: 1 });
  return posts;
}

export async function fetchMostReadPosts(params: {
  categoryId?: number;
  limit?: number;
}): Promise<PostWithMeta[]> {
  const { categoryId, limit = 5 } = params;
  const { posts } = await fetchTjPosts({
    perPage: 25,
    page: 1,
    category: categoryId ?? undefined,
  });
  const list = [...posts].sort((a, b) => {
    const va = a.viewCount ?? 0;
    const vb = b.viewCount ?? 0;
    if (vb !== va) return vb - va;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
  return list.filter((p) => (p.viewCount ?? 0) > 0).slice(0, limit);
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
  const { baseSlug, categoryId, limit = 4 } = params;
  const { posts } = await fetchTjPosts({ perPage: 30, page: 1, category: categoryId });
  const candidates = posts.filter((p) => p.slug !== baseSlug);
  candidates.sort((a, b) => {
    const va = a.viewCount ?? 0;
    const vb = b.viewCount ?? 0;
    if (vb !== va) return vb - va;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
  return candidates.slice(0, limit);
}

export async function fetchTrendingByPeriod(params: {
  period: "week" | "month";
  categoryId?: number;
  limit?: number;
}): Promise<PostWithMeta[]> {
  const { period, categoryId, limit = 5 } = params;
  const days = period === "week" ? 7 : 30;
  const after = new Date();
  after.setDate(after.getDate() - days);
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
  return sorted.slice(0, limit);
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

export async function fetchPostBySlug(slug: string): Promise<PostWithMeta | null> {
  const res = await fetch(`${WP_BASE}/post/${encodeURIComponent(slug)}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) return null;
  const post = (await res.json()) as PostWithMeta | null;
  return post ?? null;
}

async function fetchCategoriesRaw(): Promise<WPCategory[]> {
  const res = await fetch(`${WP_BASE}/categories`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as WPCategory[];
  return Array.isArray(data)
    ? data.filter((c) => c.id !== 1).map((c) => ({
        ...c,
        id: Number(c.id),
        parent: Number(c.parent) || 0,
      }))
    : [];
}

export const fetchCategories = unstable_cache(fetchCategoriesRaw, ["tj-categories"], {
  revalidate: 600,
});

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
    const res = await fetch(`${WP_BASE}/home`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    return (await res.json()) as TjHomeResponse;
  } catch {
    return null;
  }
}
