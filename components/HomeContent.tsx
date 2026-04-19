import HeroSection from "./HeroSection";
import HomeLoadMoreGrid from "./HomeLoadMoreGrid";
import OfferteSidebar from "./OfferteSidebar";
import TrendingSidebar from "./TrendingSidebar";
import MostReadSidebar from "./MostReadSidebar";
import TrendingByPeriodSidebar from "./TrendingByPeriodSidebar";
import InlineBannerPlaceholder from "./InlineBannerPlaceholder";
import type { PostWithMeta } from "@/lib/api";

interface HomeContentProps {
  initialPosts: PostWithMeta[];
  initialTotalPages: number;
  /** Pagine già caricate lato server (per "Load more" senza duplicati). */
  initialPagesConsumed?: number;
  offertePosts: PostWithMeta[];
  trendingPosts: PostWithMeta[];
  mostReadPosts: PostWithMeta[];
  weekTrendingPosts: PostWithMeta[];
  monthTrendingPosts: PostWithMeta[];
  categoryId?: number;
}

export default function HomeContent({
  initialPosts,
  initialTotalPages,
  initialPagesConsumed = 1,
  offertePosts,
  trendingPosts,
  mostReadPosts,
  weekTrendingPosts,
  monthTrendingPosts,
  categoryId,
}: HomeContentProps) {
  const HERO_POSTS_TARGET = 4;
  const heroPosts = initialPosts.slice(0, HERO_POSTS_TARGET);
  const initialGridPosts = initialPosts.slice(HERO_POSTS_TARGET);
  const emptyGridIsExpected = initialPosts.length > 0 && initialPosts.length <= HERO_POSTS_TARGET;
  const homeSidebarSlot =
    process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME_SIDEBAR ??
    process.env.NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE_SIDEBAR;

  return (
    <div className="max-w-7xl mx-auto px-0 md:px-4 py-6">
      <h1 className="sr-only">
        TechJournal: notizie su Apple, Tech e Gadget
      </h1>
      {/* Sezione in testa: tutta la larghezza, 4 articoli (1 grande + 3 a destra). La sidebar inizia sotto. */}
      <HeroSection posts={heroPosts} />
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 min-w-0">
          <HomeLoadMoreGrid
            initialPosts={initialGridPosts}
            initialTotalPages={initialTotalPages}
            initialPagesConsumed={initialPagesConsumed}
            categoryId={categoryId}
            emptyGridIsExpected={emptyGridIsExpected}
          />
        </div>
        <div className="flex flex-col gap-6 lg:w-[320px] shrink-0">
          <div className="flex gap-4 items-start">
            <a
              href="https://www.facebook.com/techjournal.it"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook, 9 Seguono"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded bg-[#3b5998] text-white text-sm font-medium hover:opacity-90"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M22 12a10 10 0 10-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.88 3.78-3.88 1.1 0 2.24.2 2.24.2v2.45H15.2c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0022 12z" />
              </svg>
              <span>9 Seguono</span>
            </a>
            <a
              href="https://www.instagram.com/techjournal.it"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram, 38 Followers"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded bg-[#c13584] text-white text-sm font-medium hover:opacity-90"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M12 2.16c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.64.07 4.85 0 3.2-.01 3.58-.07 4.85-.15 3.25-1.69 4.77-4.92 4.92-1.27.06-1.64.07-4.85.07-3.2 0-3.58-.01-4.85-.07-3.25-.15-4.77-1.69-4.92-4.92A69.2 69.2 0 012.16 12c0-3.2.01-3.58.07-4.85.15-3.25 1.69-4.77 4.92-4.92 1.27-.06 1.64-.07 4.85-.07zm0 2.18c-3.14 0-3.51.01-4.75.07-2.4.11-3.5 1.23-3.62 3.62-.06 1.24-.07 1.61-.07 4.75s.01 3.51.07 4.75c.11 2.4 1.23 3.5 3.62 3.62 1.24.06 1.61.07 4.75.07s3.51-.01 4.75-.07c2.4-.11 3.5-1.23 3.62-3.62.06-1.24.07-1.61.07-4.75s-.01-3.51-.07-4.75c-.11-2.4-1.23-3.5-3.62-3.62-1.24-.06-1.61-.07-4.75-.07zm0 3.53a4.13 4.13 0 110 8.26 4.13 4.13 0 010-8.26zm0 2.18a1.95 1.95 0 100 3.9 1.95 1.95 0 000-3.9zm5.26-2.35a.96.96 0 110 1.93.96.96 0 010-1.93z" />
              </svg>
              <span>38 Followers</span>
            </a>
          </div>
          <OfferteSidebar posts={offertePosts} />
          {/* Banner sotto la colonna Offerte */}
          <InlineBannerPlaceholder
            width="100%"
            height={250}
            adSlot={homeSidebarSlot}
          />
          <MostReadSidebar posts={mostReadPosts} />
          <TrendingByPeriodSidebar weekPosts={weekTrendingPosts} monthPosts={monthTrendingPosts} />
          <TrendingSidebar posts={trendingPosts} />
        </div>
      </div>
    </div>
  );
}
