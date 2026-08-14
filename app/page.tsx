import {
  fetchHome,
  fetchMostReadPosts,
  fetchPosts,
  fetchPostsByCategorySlug,
  fetchTrendingWeekAndMonth,
  type PostListItem,
} from "@/lib/api";
import HomeContent from "@/components/HomeContent";
import { SITE_URL } from "@/lib/constants";
import type { Metadata } from "next";

/** Revalidate breve: migliora TTFB/bfcache mantenendo contenuti aggiornati. */
/**
 * Rete di sicurezza, non il meccanismo primario: la home viene invalidata
 * on-demand dal webhook di pubblicazione (`/api/webhooks/wp-post-published`).
 * Se il webhook non è configurato o fallisce, si riallinea entro un'ora.
 */
export const revalidate = 3600;

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

const emptyPosts: PostListItem[] = [];
const INITIAL_POSTS_TARGET = 12;
const RETRY_DELAYS_MS = [0, 250, 700] as const;

async function waitMs(ms: number): Promise<void> {
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function HomePage() {
  let initialPosts = emptyPosts;
  let totalPages = 1;
  let pagesConsumed = 0;
  let offertePosts = emptyPosts;
  let mostReadPosts = emptyPosts;
  let weekTrendingPosts = emptyPosts;
  let monthTrendingPosts = emptyPosts;

  const loadFromPostsFallback = async () => {
    let sawUpstreamError = false;
    for (const delay of RETRY_DELAYS_MS) {
      await waitMs(delay);
      const { posts, totalPages: tp, error } = await fetchPosts({
        perPage: INITIAL_POSTS_TARGET,
        page: 1,
      });
      if (error) {
        sawUpstreamError = true;
        console.error("[Home] fetchPosts fallback in errore upstream, retry...");
      }
      if (!posts?.length) continue;
      initialPosts = posts;
      totalPages = tp;
      pagesConsumed = 1;
      break;
    }
    if (!initialPosts.length) {
      // Distinzione esplicita per il monitoring: home vuota per errore API
      // (anomalia) vs catalogo realmente senza post (stato legittimo).
      if (sawUpstreamError) {
        console.error(
          "[Home] render senza articoli: errore upstream persistente dopo i retry (NON è un catalogo vuoto)"
        );
      } else {
        console.error("[Home] render senza articoli: la API ha risposto con lista vuota");
      }
      return;
    }
    const [offerte, mostRead, trendingByPeriod] = await Promise.all([
      fetchPostsByCategorySlug("offerte", 5).catch(() => emptyPosts),
      fetchMostReadPosts({ limit: 5 }).catch(() => emptyPosts),
      fetchTrendingWeekAndMonth({ limit: 5 }).catch(() => ({ week: emptyPosts, month: emptyPosts })),
    ]);
    offertePosts = offerte;
    mostReadPosts = mostRead;
    weekTrendingPosts = trendingByPeriod.week ?? emptyPosts;
    monthTrendingPosts = trendingByPeriod.month ?? emptyPosts;
  };

  try {
    let homeData = null as Awaited<ReturnType<typeof fetchHome>>;
    for (const delay of RETRY_DELAYS_MS) {
      await waitMs(delay);
      homeData = await fetchHome();
      if (homeData?.initial?.posts?.length) break;
    }
    if (homeData?.initial?.posts?.length) {
      initialPosts = homeData.initial.posts;
      totalPages = homeData.initial.totalPages ?? 1;
      pagesConsumed = homeData.initial.pagesConsumed ?? 1;
      offertePosts = homeData.offerte ?? emptyPosts;
      mostReadPosts = homeData.mostRead ?? emptyPosts;
      weekTrendingPosts = homeData.weekTrending ?? emptyPosts;
      monthTrendingPosts = homeData.monthTrending ?? emptyPosts;
    } else {
      console.error("[Home] tj/v1/home non disponibile dopo i retry: fallback su /posts");
      await loadFromPostsFallback();
    }
  } catch (e) {
    console.error("[Home] errore caricamento home, fallback su /posts:", e);
    try {
      await loadFromPostsFallback();
    } catch (fallbackError) {
      // API irraggiungibile: layout con dati vuoti
      console.error("[Home] anche il fallback /posts è fallito:", fallbackError);
    }
  }

  return (
    <>
      <HomeContent
        initialPosts={initialPosts}
        initialTotalPages={totalPages}
        initialPagesConsumed={pagesConsumed}
        offertePosts={offertePosts}
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
