import { fetchPosts, fetchPostsForInitialDisplay, fetchPostsByCategorySlug } from "@/lib/api";
import HomeContent from "@/components/HomeContent";

export const revalidate = 60;

export default async function HomePage() {
  const [
    { posts: initialPosts, totalPages, pagesConsumed },
    offertePosts,
    trendingPosts,
  ] = await Promise.all([
    fetchPostsForInitialDisplay({}),
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
    />
  );
}
