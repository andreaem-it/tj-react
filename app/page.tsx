import { fetchHome, fetchPosts, type PostWithMeta } from "@/lib/api";
import HomeContent from "@/components/HomeContent";
import { SITE_URL } from "@/lib/constants";
import type { Metadata } from "next";

/** Revalidate breve: migliora TTFB/bfcache mantenendo contenuti aggiornati. */
export const revalidate = 120;

const siteUrl = SITE_URL.replace(/\/$/, "");

export const metadata: Metadata = {
  title: "TechJournal - Notizie Apple, iPhone, Mac, Tech e Gadget",
  description: "Ultime notizie su Apple, iPhone, Mac, app, tech e gadget. Recensioni, guide e offerte.",
  alternates: { canonical: siteUrl },
  openGraph: {
    title: "TechJournal - Notizie Apple, Tech e Gadget",
    description: "Ultime notizie su Apple, iPhone, Mac, app e tecnologia. Recensioni, guide e offerte.",
    url: siteUrl,
    siteName: "TechJournal",
    type: "website",
    images: [{ url: `${siteUrl}/og-default.png`, width: 1200, height: 630, alt: "TechJournal" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "TechJournal - Notizie Apple, Tech e Gadget",
    description: "Ultime notizie su Apple, iPhone, Mac, app e tecnologia.",
  },
};

const emptyPosts: PostWithMeta[] = [];
const INITIAL_POSTS_TARGET = 12;

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
    <>
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
      <form
        action="/search"
        method="get"
        className="sr-only"
        tool-name="search-articles"
        tool-description="Search TechJournal articles by keyword"
      >
        <label htmlFor="webmcp-home-search">Search query</label>
        <input
          id="webmcp-home-search"
          type="search"
          name="q"
          tool-param-description="Keyword to search in article titles and content"
          defaultValue=""
        />
        <button type="submit">Search</button>
      </form>
    </>
  );
}
