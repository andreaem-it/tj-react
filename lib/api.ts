const WP_BASE = "https://www.techjournal.it/wp-json/wp/v2";

export interface WPCategory {
  id: number;
  name: string;
  slug: string;
  link: string;
  taxonomy: string;
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
  return {
    id: p.id,
    date: p.date,
    slug: p.slug,
    link: p.link,
    title: stripHtml(p.title.rendered),
    excerpt: stripHtml(p.excerpt.rendered),
    content: p.content.rendered,
    categoryName: category.name,
    categorySlug: category.slug,
    categoryId: category.id,
    imageUrl: media?.source_url ?? null,
    imageAlt: media?.alt_text ?? p.title.rendered,
  };
}

export async function fetchPosts(params: {
  perPage?: number;
  page?: number;
  categoryId?: number;
}): Promise<{ posts: PostWithMeta[]; totalPages: number }> {
  const { perPage = 10, page = 1, categoryId } = params;
  const searchParams = new URLSearchParams({
    per_page: String(perPage),
    page: String(page),
    _embed: "1",
  });
  if (categoryId) searchParams.set("categories", String(categoryId));
  const res = await fetch(`${WP_BASE}/posts?${searchParams.toString()}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`WP API error: ${res.status}`);
  const totalPages = Number(res.headers.get("X-WP-TotalPages")) || 1;
  const raw: WPPost[] = await res.json();
  const posts = raw.map(postFromApi);
  return { posts, totalPages };
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
  const res = await fetch(`${WP_BASE}/categories?per_page=50`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.filter((c: { id: number }) => c.id !== 1);
}

export async function fetchPostsByCategorySlug(
  slug: string,
  perPage = 5
): Promise<PostWithMeta[]> {
  const categories = await fetchCategories();
  const cat = categories.find((c) => c.slug === slug);
  if (!cat) return [];
  const { posts } = await fetchPosts({ perPage, categoryId: cat.id });
  return posts;
}
