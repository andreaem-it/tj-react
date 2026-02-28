import { fetchPosts, fetchPostsByCategorySlug } from "@/lib/api";
import HomeContent from "@/components/HomeContent";

export const revalidate = 60;

export default async function HomePage() {
  const [{ posts: initialPosts, totalPages }, offertePosts, trendingPosts] = await Promise.all([
    fetchPosts({ perPage: 10, page: 1 }),
    fetchPostsByCategorySlug("offerte", 5),
    fetchPosts({ perPage: 10, page: 1 }).then((r) => r.posts),
  ]);

  return (
    <HomeContent
      initialPosts={initialPosts}
      initialTotalPages={totalPages}
      offertePosts={offertePosts}
      trendingPosts={trendingPosts}
    />
  );
}
