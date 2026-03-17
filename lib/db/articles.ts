/**
 * Layer dati articoli. Sostituire con D1 quando pronto (getD1Client().prepare().bind()).
 * Per ora store in-memory per sviluppo UI.
 */

export type ArticleStatus = "draft" | "published" | "private" | "archived";
export type ArticleSource = "wordpress" | "native";

export interface Article {
  id: number;
  wp_id: number | null;
  slug: string;
  title: string;
  excerpt: string;
  content: string; // HTML o JSON blocchi BlockNote
  category_id: number | null;
  category_name: string;
  category_slug: string;
  author_name: string;
  author_avatar_url: string | null;
  image_url: string | null;
  image_alt: string;
  view_count: number;
  published_at: string | null;
  modified_at: string | null;
  status: ArticleStatus;
  source: ArticleSource;
  link: string | null;
  created_at: string;
  updated_at: string;
  meta_title: string | null;
  meta_description: string | null;
}

export interface ArticleInsert {
  slug: string;
  title: string;
  excerpt?: string;
  content?: string;
  category_id?: number | null;
  category_name?: string;
  category_slug?: string;
  author_name?: string;
  author_avatar_url?: string | null;
  image_url?: string | null;
  image_alt?: string;
  status?: ArticleStatus;
  source?: ArticleSource;
  published_at?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
}

const store = new Map<number, Article>();
let nextId = 1;

function now(): string {
  return new Date().toISOString();
}

export function listArticles(params?: {
  status?: ArticleStatus;
  page?: number;
  perPage?: number;
}): { items: Article[]; total: number } {
  let items = Array.from(store.values());
  if (params?.status) {
    items = items.filter((a) => a.status === params.status);
  }
  items.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  const total = items.length;
  const page = Math.max(1, params?.page ?? 1);
  const perPage = Math.min(50, Math.max(1, params?.perPage ?? 10));
  const start = (page - 1) * perPage;
  items = items.slice(start, start + perPage);
  return { items, total };
}

export function getArticleById(id: number): Article | null {
  return store.get(id) ?? null;
}

export function getArticleBySlug(slug: string): Article | null {
  return Array.from(store.values()).find((a) => a.slug === slug) ?? null;
}

export function createArticle(input: ArticleInsert): Article {
  const id = nextId++;
  const nowStr = now();
  const article: Article = {
    id,
    wp_id: null,
    slug: input.slug,
    title: input.title,
    excerpt: input.excerpt ?? "",
    content: input.content ?? "",
    category_id: input.category_id ?? null,
    category_name: input.category_name ?? "",
    category_slug: input.category_slug ?? "",
    author_name: input.author_name ?? "Admin",
    author_avatar_url: input.author_avatar_url ?? null,
    image_url: input.image_url ?? null,
    image_alt: input.image_alt ?? "",
    view_count: 0,
    published_at: input.published_at ?? null,
    modified_at: nowStr,
    status: input.status ?? "draft",
    source: input.source ?? "native",
    link: null,
    created_at: nowStr,
    updated_at: nowStr,
    meta_title: input.meta_title ?? null,
    meta_description: input.meta_description ?? null,
  };
  store.set(id, article);
  return article;
}

export function updateArticle(
  id: number,
  input: Partial<ArticleInsert> & { modified_at?: string }
): Article | null {
  const existing = store.get(id);
  if (!existing) return null;
  const updated: Article = {
    ...existing,
    ...input,
    id: existing.id,
    wp_id: existing.wp_id,
    created_at: existing.created_at,
    updated_at: input.modified_at ?? now(),
    modified_at: input.modified_at ?? existing.modified_at ?? now(),
    meta_title: input.meta_title !== undefined ? input.meta_title : (existing as Article & { meta_title?: string | null }).meta_title ?? null,
    meta_description: input.meta_description !== undefined ? input.meta_description : (existing as Article & { meta_description?: string | null }).meta_description ?? null,
  };
  store.set(id, updated);
  return updated;
}

export function deleteArticle(id: number): boolean {
  return store.delete(id);
}
