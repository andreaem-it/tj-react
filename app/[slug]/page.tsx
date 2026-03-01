import { redirect, notFound } from "next/navigation";
import { fetchPostBySlug, fetchPosts, fetchCategories, fetchPostsByCategorySlug, fetchPostsForInitialDisplay, resolveCategoryByUrlSlug, getCategoryUrlSlugFromWpSlug } from "@/lib/api";
import HomeContent from "@/components/HomeContent";
import OffertePage from "@/components/OffertePage";

export const revalidate = 60;

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ArticlePageProps) {
  const { slug } = await params;
  const post = await fetchPostBySlug(slug);
  if (post) return { title: `${post.title} | TechJournal` };
  const categories = await fetchCategories();
  const cat = resolveCategoryByUrlSlug(categories, slug);
  if (cat) return { title: `${cat.name} | TechJournal` };
  return { title: "Pagina non trovata" };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const post = await fetchPostBySlug(slug);

  if (post) {
    redirect(`/${getCategoryUrlSlugFromWpSlug(post.categorySlug)}/${slug}`);
  }

  const categories = await fetchCategories();
  const cat = resolveCategoryByUrlSlug(categories, slug);
  if (!cat) notFound();

  if (slug === "offerte") {
    const offertePosts = await fetchPostsByCategorySlug("offerte", 10);
    return <OffertePage posts={offertePosts} />;
  }

  const [
    { posts: initialPosts, totalPages, pagesConsumed },
    offertePosts,
    trendingPosts,
  ] = await Promise.all([
    fetchPostsForInitialDisplay({ categoryId: cat.id, categories }),
    fetchPostsByCategorySlug("offerte", 5),
    fetchPosts({ perPage: 20, page: 1 }).then((r) => r.posts),
  ]);

  return (
    <HomeContent
      initialPosts={initialPosts}
      initialTotalPages={totalPages}
      initialPagesConsumed={pagesConsumed}
      offertePosts={offertePosts}
      trendingPosts={trendingPosts}
      categoryId={cat.id}
    />
  );
}
