import { fetchPosts, fetchPostsForInitialDisplay, fetchPostsByCategorySlug, fetchMostReadPosts, fetchTrendingByPeriod } from "@/lib/api";
import HomeContent from "@/components/HomeContent";

export const dynamic = "force-dynamic";

/** Dimensione pagina usata dal client (Load more) e dall'API /api/posts. */
const CLIENT_PAGE_SIZE = 10;

const emptyPosts: Awaited<ReturnType<typeof fetchPosts>>["posts"] = [];
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
    const [initial, offerte, trending, mostRead, week, month] = await Promise.all([
      fetchPostsForInitialDisplay({}).catch(() => emptyInitial),
      fetchPostsByCategorySlug("offerte", 5).catch(() => emptyPosts),
      fetchPosts({ perPage: 20, page: 1 }).then((r) => r.posts).catch(() => emptyPosts),
      fetchMostReadPosts({ limit: 5 }).catch(() => emptyPosts),
      fetchTrendingByPeriod({ period: "week", limit: 5 }).catch(() => emptyPosts),
      fetchTrendingByPeriod({ period: "month", limit: 5 }).catch(() => emptyPosts),
    ]);
    if (initial.posts.length > 0) {
      initialPosts = initial.posts;
      totalPages = initial.totalPages;
      pagesConsumed = Math.ceil(initialPosts.length / CLIENT_PAGE_SIZE);
    }
    offertePosts = offerte;
    trendingPosts = trending;
    mostReadPosts = mostRead;
    weekTrendingPosts = week;
    monthTrendingPosts = month;
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
