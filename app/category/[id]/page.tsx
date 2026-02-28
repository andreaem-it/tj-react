import { notFound } from "next/navigation";
import { fetchPosts, fetchCategories, fetchPostsByCategorySlug } from "@/lib/api";
import HomeContent from "@/components/HomeContent";

export const revalidate = 60;

interface CategoryPageProps {
  params: Promise<{ id: string }>;
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { id } = await params;
  const idNum = Number(id);
  const isNumeric = !Number.isNaN(idNum);

  let categoryId: number | undefined;
  if (isNumeric) {
    categoryId = idNum;
  } else {
    const categories = await fetchCategories();
    const cat = categories.find((c) => c.slug === id);
    if (!cat) notFound();
    categoryId = cat.id;
  }

  const [{ posts: initialPosts, totalPages }, offertePosts, trendingPosts] = await Promise.all([
    fetchPosts({ perPage: 10, page: 1, categoryId }),
    fetchPostsByCategorySlug("offerte", 5),
    fetchPosts({ perPage: 10, page: 1 }).then((r) => r.posts),
  ]);

  if (initialPosts.length === 0 && idNum > 0) notFound();

  return (
    <HomeContent
      initialPosts={initialPosts}
      initialTotalPages={totalPages}
      offertePosts={offertePosts}
      trendingPosts={trendingPosts}
      categoryId={categoryId}
    />
  );
}
