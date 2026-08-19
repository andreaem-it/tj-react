import HeroSection from "./HeroSection";
import HomeLoadMoreGrid from "./HomeLoadMoreGrid";
import SocialFollowButtons from "./SocialFollowButtons";
import OfferteSidebar from "./OfferteSidebar";
import HomeRankingsSidebar from "./HomeRankingsSidebar";
import InlineBannerPlaceholder from "./InlineBannerPlaceholder";
import type { PostListItem } from "@/lib/api";

interface HomeContentProps {
  initialPosts: PostListItem[];
  /**
   * Articoli realmente consumati dall'API, anche quelli non mostrati qui.
   *
   * Distinto da `initialPosts` perché la home modulare mostra alcuni articoli in
   * sezioni proprie — lo speciale del momento — e li toglie dalla griglia per
   * non ripeterli. La paginazione di "carica altri" deve però continuare a
   * sapere quanti articoli sono stati consumati, altrimenti la pagina successiva
   * ripropone quelli già a schermo.
   *
   * Assente sulle pagine categoria, dove mostrato e consumato coincidono.
   */
  consumedPosts?: PostListItem[];
  initialTotalPages: number;
  /** Pagine già caricate lato server (per "Load more" senza duplicati). */
  initialPagesConsumed?: number;
  offertePosts: PostListItem[];
  /** Compatibilità con le pagine categoria; le classifiche temporali sostituiscono il vecchio blocco duplicato. */
  trendingPosts?: PostListItem[];
  mostReadPosts: PostListItem[];
  weekTrendingPosts: PostListItem[];
  monthTrendingPosts: PostListItem[];
  categoryId?: number;
  /**
   * Testo dell'H1. Le pagine categoria devono passare il proprio: senza,
   * ereditavano l'H1 della home e ogni archivio (`/apple`, `/tech`, …)
   * dichiarava a Google lo stesso argomento, in contraddizione col `<title>`.
   */
  heading?: string;

  // ---------------------------------------------------------------------------
  // Slot della home modulare.
  //
  // Sono opzionali e assenti sulle pagine categoria, che condividono questo
  // componente: senza di essi il rendering è identico a prima, quindi la home
  // può evolvere senza toccare venti archivi. La configurazione delle sezioni
  // vive in `lib/home/sections.ts`; qui ci sono solo i punti in cui atterrano.
  // ---------------------------------------------------------------------------

  /** Barra breaking, sopra l'apertura. */
  breakingSlot?: React.ReactNode;
  /** Sezioni fra l'apertura e il flusso cronologico (es. speciale del momento). */
  beforeGridSlot?: React.ReactNode;
  /** Sezioni dopo il flusso: evergreen, Price Radar, compatibilità. */
  afterGridSlot?: React.ReactNode;
  /**
   * Sostituisce la classifica di lettura in sidebar.
   *
   * Serve quando il contatore di visualizzazioni non ha abbastanza dati per
   * ordinare qualcosa: al suo posto va un modulo costruito su un dato reale.
   */
  rankingsSlot?: React.ReactNode;
}

const DEFAULT_HEADING = "TechJournal: notizie su Apple, Tech e Gadget";

export default function HomeContent({
  initialPosts,
  consumedPosts,
  initialTotalPages,
  initialPagesConsumed = 1,
  offertePosts,
  mostReadPosts,
  weekTrendingPosts,
  monthTrendingPosts,
  categoryId,
  heading = DEFAULT_HEADING,
  breakingSlot,
  beforeGridSlot,
  afterGridSlot,
  rankingsSlot,
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
      <h1 className="sr-only">{heading}</h1>
      {breakingSlot}
      {/* Sezione in testa: tutta la larghezza, 4 articoli (1 grande + 3 a destra). La sidebar inizia sotto. */}
      <HeroSection posts={heroPosts} />
      {beforeGridSlot && <div className="mb-8">{beforeGridSlot}</div>}
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 min-w-0">
          <HomeLoadMoreGrid
            initialPosts={initialGridPosts}
            /* Post già consumati dall'API, hero compresi: la griglia ne riceve
               solo una parte, ma per calcolare la pagina da cui riprendere
               serve il totale, altrimenti si richiedono post già a schermo. */
            initialConsumedPosts={consumedPosts ?? initialPosts}
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
          {rankingsSlot ?? (
            <HomeRankingsSidebar
              mostReadPosts={mostReadPosts}
              weekPosts={weekTrendingPosts}
              monthPosts={monthTrendingPosts}
            />
          )}
        </div>
      </div>
      {afterGridSlot && <div className="mt-10 flex flex-col gap-10">{afterGridSlot}</div>}
    </div>
  );
}
