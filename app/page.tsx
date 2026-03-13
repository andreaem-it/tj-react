import { fetchHome, type PostWithMeta } from "@/lib/api";
import HomeContent from "@/components/HomeContent";

/** ISR: cache 5 min per ridurre carico su WordPress (lsphp). */
export const revalidate = 300;

const emptyPosts: PostWithMeta[] = [];
const emptyInitial = { posts: [] as typeof emptyPosts, totalPages: 1, pagesConsumed: 0 };

export default async function HomePage() {
  let initialPosts = emptyPosts;
  let totalPages = 1;
  let pagesConsumed = 0;
  let offertePosts = emptyPosts;
  let trendingPosts = emptyPosts;
  let mostReadPosts = emptyPosts;
  let weekTrendingPosts = emptyPosts;
  let monthTrendingPosts = emptyPosts;

  try {
    const home = await fetchHome();
    if (home?.initial?.posts?.length) {
      initialPosts = home.initial.posts;
      totalPages = home.initial.totalPages ?? 1;
      pagesConsumed = home.initial.pagesConsumed ?? 1;
    }
    offertePosts = home?.offerte ?? emptyPosts;
    trendingPosts = home?.trending ?? emptyPosts;
    mostReadPosts = home?.mostRead ?? emptyPosts;
    weekTrendingPosts = home?.weekTrending ?? emptyPosts;
    monthTrendingPosts = home?.monthTrending ?? emptyPosts;
  } catch {
    // API irraggiungibile: layout con dati vuoti
  }

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
    />
  );
}
