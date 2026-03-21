import { redirect, notFound } from "next/navigation";
import {
  fetchPostBySlug,
  fetchPosts,
  fetchCategories,
  fetchPostsByCategorySlug,
  fetchPostsForInitialDisplay,
  fetchMostReadPosts,
  fetchTrendingWeekAndMonth,
  resolveCategoryByUrlSlug,
  getCategoryUrlSlugFromWpSlug,
  getCategoryUrlSlug,
} from "@/lib/api";
import HomeContent from "@/components/HomeContent";
import { SITE_URL } from "@/lib/constants";
import type { Metadata } from "next";

export const revalidate = 300;

/** Slug che sembrano file statici: non chiamare l'API post (es. richieste errate / bot). */
const LOOKS_LIKE_STATIC_FILE = /\.(png|jpe?g|gif|webp|svg|ico|txt|xml|json|woff2?|webmanifest)$/i;

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  if (LOOKS_LIKE_STATIC_FILE.test(slug)) {
    notFound();
  }
  const post = await fetchPostBySlug(slug);
  if (post) {
    const path = `/${getCategoryUrlSlugFromWpSlug(post.categorySlug)}/${post.slug}`;
    const canonical = `${SITE_URL.replace(/\/$/, "")}${path}`;
    const description = post.excerpt?.slice(0, 160) || post.title;
    return {
      title: `${post.title} | TechJournal`,
      description,
      alternates: { canonical },
      openGraph: { title: post.title, description, url: canonical, siteName: "TechJournal" },
      twitter: { card: "summary_large_image", title: post.title, description },
    };
  }
  const categories = await fetchCategories();
  const cat = resolveCategoryByUrlSlug(categories, slug);
  if (cat) {
    const urlSlug = getCategoryUrlSlug(cat);
    const canonical = `${SITE_URL.replace(/\/$/, "")}/${urlSlug}`;
    const description = `Ultime notizie e articoli nella categoria ${cat.name} su TechJournal.`;
    return {
      title: `${cat.name} | TechJournal`,
      description,
      alternates: { canonical },
      openGraph: { title: cat.name, description, url: canonical, siteName: "TechJournal" },
      twitter: { card: "summary", title: cat.name, description },
    };
  }
  return { title: "Pagina non trovata" };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;

  if (LOOKS_LIKE_STATIC_FILE.test(slug)) {
    notFound();
  }

  if (slug === "offerte") {
    redirect("/price-radar");
  }

  const post = await fetchPostBySlug(slug);

  if (post) {
    redirect(`/${getCategoryUrlSlugFromWpSlug(post.categorySlug)}/${slug}`);
  }

  const categories = await fetchCategories();
  const cat = resolveCategoryByUrlSlug(categories, slug);
  if (!cat) notFound();

  const [
    { posts: initialPosts, totalPages, pagesConsumed },
    offertePosts,
    trendingPosts,
    mostReadPosts,
    { week: weekTrendingPosts, month: monthTrendingPosts },
  ] = await Promise.all([
    fetchPostsForInitialDisplay({ categoryId: cat.id, categories }),
    fetchPostsByCategorySlug("offerte", 5),
    fetchPosts({ perPage: 20, page: 1 }).then((r) => r.posts),
    fetchMostReadPosts({ categoryId: cat.id, limit: 5 }),
    fetchTrendingWeekAndMonth({ categoryId: cat.id, limit: 5 }),
  ]);

  return (
    <HomeContent
      initialPosts={initialPosts}
      initialTotalPages={totalPages}
      initialPagesConsumed={pagesConsumed}
      offertePosts={offertePosts}
      trendingPosts={trendingPosts}
      mostReadPosts={mostReadPosts}
      weekTrendingPosts={weekTrendingPosts}
      monthTrendingPosts={monthTrendingPosts}
      categoryId={cat.id}
    />
  );
}
