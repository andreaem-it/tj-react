const WP_BASE = "https://www.techjournal.it/wp-json/wp/v2";

export interface WPCategory {
  id: number;
  name: string;
  slug: string;
  link: string;
  taxonomy: string;
  parent?: number;
}

export interface WPMediaDetails {
  width: number;
  height: number;
  source_url: string;
  sizes?: Record<string, { source_url: string; width: number; height: number }>;
}

export interface WPFeaturedMedia {
  id: number;
  source_url: string;
  alt_text: string;
  media_details?: WPMediaDetails;
}

export interface WPPost {
  id: number;
  date: string;
  slug: string;
  link: string;
  title: { rendered: string };
  content: { rendered: string };
  excerpt: { rendered: string };
  featured_media: number;
  categories: number[];
  _embedded?: {
    "wp:featuredmedia"?: WPFeaturedMedia[];
    "wp:term"?: WPCategory[][];
  };
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
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

/** Decodifica entità HTML (es. &#8217; → ', &amp; → &) nei testi provenienti da WordPress. */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&nbsp;/g, "\u00A0")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&rsquo;/g, "\u2019")
    .replace(/&lsquo;/g, "\u2018")
    .replace(/&rdquo;/g, "\u201C")
    .replace(/&ldquo;/g, "\u201D")
    .replace(/&hellip;/g, "\u2026")
    .replace(/&ndash;/g, "\u2013")
    .replace(/&mdash;/g, "\u2014");
}

function postFromApi(p: WPPost): PostWithMeta {
  const media = p._embedded?.["wp:featuredmedia"]?.[0];
  const terms = p._embedded?.["wp:term"]?.[0] ?? [];
  const category = terms.find((t) => t.taxonomy === "category") ?? {
    name: "Notizie",
    slug: "notizie",
    id: 0,
    link: "",
    taxonomy: "category",
  };
  const rawTitle = stripHtml(p.title.rendered);
  const rawExcerpt = stripHtml(p.excerpt.rendered);
  return {
    id: p.id,
    date: p.date,
    slug: p.slug,
    link: p.link,
    title: decodeHtmlEntities(rawTitle),
    excerpt: decodeHtmlEntities(rawExcerpt),
    content: p.content.rendered,
    categoryName: category.name,
    categorySlug: category.slug,
    categoryId: category.id,
    imageUrl: media?.source_url ?? null,
    imageAlt: decodeHtmlEntities(media?.alt_text ?? rawTitle),
  };
}

/**
 * Restituisce l’ID della categoria e di tutte le sottocategorie (ricorsivo).
 * Usato per far sì che la categoria principale includa i post delle sottocategorie.
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

/**
 * Una singola richiesta all’API post (un solo categoryId: l’API fa AND con più ID).
 */
async function fetchPostsSingleCategory(params: {
  perPage: number;
  page: number;
  categoryId: number;
}): Promise<{ posts: PostWithMeta[]; totalPages: number }> {
  const { perPage, page, categoryId } = params;
  const searchParams = new URLSearchParams({
    per_page: String(perPage),
    page: String(page),
    _embed: "1",
    categories: String(categoryId),
  });
  const res = await fetch(`${WP_BASE}/posts?${searchParams.toString()}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`WP API error: ${res.status}`);
  const totalPages = Number(res.headers.get("X-WP-TotalPages")) || 1;
  const raw: WPPost[] = await res.json();
  const posts = raw.map(postFromApi);
  return { posts, totalPages };
}

/**
 * Recupera tutti i post per una categoria (tutte le pagine).
 */
async function fetchAllPostsForCategory(categoryId: number): Promise<PostWithMeta[]> {
  const all: PostWithMeta[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const { posts, totalPages: tp } = await fetchPostsSingleCategory({
      perPage: 100,
      page,
      categoryId,
    });
    totalPages = tp;
    all.push(...posts);
    if (posts.length < 100 || page >= totalPages) break;
    page += 1;
  } while (true);
  return all;
}

export async function fetchPosts(params: {
  perPage?: number;
  page?: number;
  categoryId?: number;
  categoryIds?: number[];
}): Promise<{ posts: PostWithMeta[]; totalPages: number }> {
  const { perPage = 10, page = 1, categoryId, categoryIds } = params;
  const ids = categoryIds ?? (categoryId != null && categoryId > 0 ? [categoryId] : []);

  if (ids.length === 0) {
    const searchParams = new URLSearchParams({
      per_page: String(perPage),
      page: String(page),
      _embed: "1",
    });
    const res = await fetch(`${WP_BASE}/posts?${searchParams.toString()}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error(`WP API error: ${res.status}`);
    const totalPages = Number(res.headers.get("X-WP-TotalPages")) || 1;
    const raw: WPPost[] = await res.json();
    const posts = raw.map(postFromApi);
    return { posts, totalPages };
  }

  if (ids.length === 1) {
    return fetchPostsSingleCategory({ perPage, page, categoryId: ids[0] });
  }

  /* Più categorie: l’API WP con più ID fa AND. Facciamo una richiesta per categoria, uniamo (OR), dedup, ordiniamo, paginiamo. */
  const byCategory = await Promise.all(ids.map((id) => fetchAllPostsForCategory(id)));
  const seen = new Set<number>();
  const merged: PostWithMeta[] = [];
  for (const posts of byCategory) {
    for (const p of posts) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      merged.push(p);
    }
  }
  merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const totalPages = Math.max(1, Math.ceil(merged.length / perPage));
  const start = (page - 1) * perPage;
  const posts = merged.slice(start, start + perPage);
  return { posts, totalPages };
}

/** Numero di post da caricare in iniziale (hero + griglia). */
const INITIAL_POSTS_TARGET = 20;

/**
 * Carica abbastanza post per la prima vista (hero 4 + griglia).
 * Se WordPress restituisce meno di per_page (es. limite a 4), fa altre richieste e unisce.
 * Restituisce pagesConsumed così il client può chiedere la pagina successiva con "Load more".
 * Con categories passate, la categoria principale include i post delle sottocategorie.
 */
export async function fetchPostsForInitialDisplay(params: {
  categoryId?: number;
  categories?: WPCategory[];
}): Promise<{ posts: PostWithMeta[]; totalPages: number; pagesConsumed: number }> {
  const { categoryId, categories } = params;
  const categoryIds =
    categoryId != null && categories?.length
      ? getCategoryIdsIncludingChildren(categories, categoryId)
      : undefined;

  /* Percorso multi-categoria: fetch esplicito per ogni id, merge e dedup, così la griglia ha sempre i post. */
  if (categoryIds && categoryIds.length > 1) {
    const byCategory = await Promise.all(categoryIds.map((id) => fetchAllPostsForCategory(id)));
    const seen = new Set<number>();
    const merged: PostWithMeta[] = [];
    for (const posts of byCategory) {
      for (const p of posts) {
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        merged.push(p);
      }
    }
    merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const posts = merged.slice(0, INITIAL_POSTS_TARGET);
    const totalPages = Math.max(1, Math.ceil(merged.length / 10));
    return { posts, totalPages, pagesConsumed: 1 };
  }

  const all: PostWithMeta[] = [];
  let page = 1;
  let totalPages = 1;

  while (all.length < INITIAL_POSTS_TARGET) {
    const { posts, totalPages: tp } = await fetchPosts({
      perPage: 20,
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

/**
 * Carica almeno MEGAMENU_POSTS_TARGET post per il megamenu.
 * Se l’API restituisce meno per richiesta (es. limite per categoria), fa più richieste e unisce.
 * Con categories passate, la categoria principale include i post delle sottocategorie.
 */
export async function fetchPostsForMegamenu(params: {
  categoryId?: number;
  categories?: WPCategory[];
}): Promise<PostWithMeta[]> {
  const { categoryId, categories } = params;
  const categoryIds =
    categoryId != null && categories
      ? getCategoryIdsIncludingChildren(categories, categoryId)
      : undefined;
  const all: PostWithMeta[] = [];
  let page = 1;
  let totalPages = 1;

  while (all.length < MEGAMENU_POSTS_TARGET) {
    const { posts, totalPages: tp } = await fetchPosts({
      perPage: 20,
      page,
      categoryIds: categoryIds ?? (categoryId != null ? [categoryId] : undefined),
    });
    totalPages = tp;
    if (posts.length === 0) break;
    all.push(...posts);
    if (all.length >= MEGAMENU_POSTS_TARGET) break;
    if (page >= totalPages) break;
    page += 1;
  }

  return all.slice(0, MEGAMENU_POSTS_TARGET);
}

export async function fetchPostBySlug(slug: string): Promise<PostWithMeta | null> {
  const res = await fetch(
    `${WP_BASE}/posts?slug=${encodeURIComponent(slug)}&_embed=1`,
    { next: { revalidate: 60 } }
  );
  if (!res.ok) return null;
  const raw: WPPost[] = await res.json();
  const post = raw[0];
  if (!post) return null;
  return postFromApi(post);
}

export async function fetchCategories(): Promise<WPCategory[]> {
  const res = await fetch(`${WP_BASE}/categories?per_page=100`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data
    .filter((c: { id: number }) => c.id !== 1)
    .map((c: { id: number; name: string; slug: string; link: string; taxonomy: string; parent?: number }) => ({
      id: Number(c.id),
      name: c.name,
      slug: c.slug,
      link: c.link,
      taxonomy: c.taxonomy,
      parent: Number(c.parent) || 0,
    }));
}

/** Mapping slug usato in URL (nav) → slug reale in WordPress. */
const URL_SLUG_TO_WP_SLUG: Record<string, string> = {
  apps: "applicazioni",
  gaming: "games",
  tech: "tecnologia",
  ia: "intelligenza-artificiale",
};

/** Slug WordPress → slug usato in URL (per redirect e link coerenti). */
const WP_SLUG_TO_URL_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(URL_SLUG_TO_WP_SLUG).map(([url, wp]) => [wp, url])
);

/** Restituisce lo slug da usare in URL per una categoria (es. /apps invece di /applicazioni). */
export function getCategoryUrlSlug(cat: WPCategory): string {
  return WP_SLUG_TO_URL_SLUG[cat.slug] ?? cat.slug;
}

/**
 * Risolve una categoria per lo slug usato in URL (es. /apps, /tech).
 * Prova prima lo slug esatto, poi il mapping verso gli slug WordPress.
 */
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
