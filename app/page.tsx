import { fetchHome, fetchPosts, type PostWithMeta } from "@/lib/api";
import HomeContent from "@/components/HomeContent";

/** Rendering a ogni richiesta per evitare homepage vuota da cache/build. */
export const dynamic = "force-dynamic";
export const revalidate = 0;

const emptyPosts: PostWithMeta[] = [];
const INITIAL_POSTS_TARGET = 20;

export default async function HomePage() {
  let initialPosts = emptyPosts;
  let totalPages = 1;
  let pagesConsumed = 0;
  let offertePosts = emptyPosts;
  let trendingPosts = emptyPosts;
  let mostReadPosts = emptyPosts;
  let weekTrendingPosts = emptyPosts;
  let monthTrendingPosts = emptyPosts;

  const loadFromPostsFallback = async () => {
    const { posts, totalPages: tp } = await fetchPosts({
      perPage: INITIAL_POSTS_TARGET,
      page: 1,
    });
    initialPosts = posts;
    totalPages = tp;
    pagesConsumed = posts.length > 0 ? 1 : 0;
  };

  try {
    const home = await fetchHome();
    if (home?.initial?.posts?.length) {
      initialPosts = home.initial.posts;
      totalPages = home.initial.totalPages ?? 1;
      pagesConsumed = home.initial.pagesConsumed ?? 1;
      offertePosts = home.offerte ?? emptyPosts;
      trendingPosts = home.trending ?? emptyPosts;
      mostReadPosts = home.mostRead ?? emptyPosts;
      weekTrendingPosts = home.weekTrending ?? emptyPosts;
      monthTrendingPosts = home.monthTrending ?? emptyPosts;
    } else {
      await loadFromPostsFallback();
    }
  } catch {
    try {
      await loadFromPostsFallback();
    } catch {
      // API irraggiungibile: layout con dati vuoti
    }
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
