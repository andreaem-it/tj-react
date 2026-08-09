import HeroSection from "./HeroSection";
import HomeLoadMoreGrid from "./HomeLoadMoreGrid";
import SocialFollowButtons from "./SocialFollowButtons";
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
    <div className="max-w-7xl mx-auto px-[5px] md:px-4 py-6">
      <h1 className="sr-only">
        TechJournal: notizie su Apple, Tech e Gadget
      </h1>
      {/* Sezione in testa: tutta la larghezza, 4 articoli (1 grande + 3 a destra). La sidebar inizia sotto. */}
      <HeroSection posts={heroPosts} />
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 min-w-0">
          <HomeLoadMoreGrid
            initialPosts={initialGridPosts}
            /* Post già consumati dall'API, hero compresi: la griglia ne riceve
               solo una parte, ma per calcolare la pagina da cui riprendere
               serve il totale, altrimenti si richiedono post già a schermo. */
            initialConsumedPosts={initialPosts}
            initialTotalPages={initialTotalPages}
            initialPagesConsumed={initialPagesConsumed}
            categoryId={categoryId}
            emptyGridIsExpected={emptyGridIsExpected}
          />
        </div>
        <div className="flex flex-col gap-6 lg:w-[320px] shrink-0">
          <SocialFollowButtons />
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
