import { Suspense } from "react";
import {
  fetchHome,
  fetchMostReadPosts,
  fetchPosts,
  fetchPostsByCategorySlug,
  fetchTrendingWeekAndMonth,
  type PostListItem,
} from "@/lib/api";
import HomeContent from "@/components/HomeContent";
import ArticleCardStatic from "@/components/ArticleCardStatic";
import BreakingBar from "@/components/home/BreakingBar";
import HomeSectionShell from "@/components/home/HomeSectionShell";
import HotTopicsSidebar from "@/components/home/HotTopicsSidebar";
import TopicSpotlight from "@/components/home/TopicSpotlight";
import BestDealsSection from "@/components/priceRadar/BestDealsSection";
import TjLink from "@/components/TjLink";
import {
  COMPATIBILITY_LIST_REVALIDATE_S,
  fetchCompatibilityDevices,
} from "@/lib/compatibility/serverApi";
import { isEvergreen } from "@/lib/content/classify";
import { getTopic } from "@/lib/content/topics";
import { activeBreaking, HOME_RANKING_OVERRIDES } from "@/lib/home/overrides";
import {
  hasUsableTrafficSignal,
  hotTopics,
  hottestTopicSlug,
  prepareItems,
  rankHomeItems,
  type RankableItem,
} from "@/lib/home/ranking";
import { sectionById } from "@/lib/home/sections";
import { SITE_URL } from "@/lib/constants";
import type { Metadata } from "next";

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

/**
 * Ingresso al database di compatibilità.
 *
 * I dispositivi sono letti dall'elenco reale e non scritti a mano: linkare slug
 * fissi significherebbe pubblicare 404 il giorno in cui il catalogo cambia. La
 * richiesta è cacheata un'ora e condivisa con gli hub di argomento.
 */
async function CompatibilitySection() {
  const section = sectionById("compatibility");
  if (!section) return null;

  const devices = await fetchCompatibilityDevices(undefined, {
    revalidate: COMPATIBILITY_LIST_REVALIDATE_S,
  }).catch(() => []);

  const recent = devices
    .filter((device) => device.releaseYear != null)
    .sort((a, b) => (b.releaseYear ?? 0) - (a.releaseYear ?? 0))
    .slice(0, 6);

  if (recent.length === 0) return null;

  return (
    <HomeSectionShell section={section}>
      <div className="rounded-lg border border-border bg-content-bg p-4 md:p-5">
        <ul className="flex flex-wrap gap-2">
          {recent.map((device) => (
            <li key={device.slug}>
              <TjLink
                href={`/compatibility/device/${device.slug}`}
                className="inline-flex items-center rounded-full border border-border bg-surface-overlay px-3 py-1.5 text-sm text-foreground transition-colors hover:border-accent hover:text-accent"
              >
                {device.name}
              </TjLink>
            </li>
          ))}
        </ul>
      </div>
    </HomeSectionShell>
  );
}

/**
 * Guide e confronti: contenuti per cui la freschezza non è il criterio.
 *
 * `excludeIds` contiene tutto ciò che la pagina mostra già — apertura, speciale
 * e flusso cronologico. Senza quel filtro la sezione ripescava articoli presenti
 * poche righe sopra: al primo render due titoli comparivano due volte, una nello
 * speciale e una qui. In pratica quindi la sezione si riempie dalla categoria
 * `guide`, che è il comportamento corretto: le guide utili non sono quelle
 * uscite stamattina.
 */
async function EvergreenSection({
  pool,
  excludeIds,
}: {
  pool: readonly RankableItem[];
  excludeIds: ReadonlySet<number>;
}) {
  const section = sectionById("evergreen");
  if (!section) return null;

  const allowed = new Set(section.filters?.contentTypes ?? []);
  const fromPool = pool
    .filter((item) =>
      allowed.size > 0
        ? allowed.has(item.classification.contentType)
        : isEvergreen(item.classification.contentType),
    )
    .map((item) => item.post)
    .filter((post) => !excludeIds.has(post.id));

  // Una richiesta cacheata, condivisa con le altre pagine che leggono la stessa
  // categoria.
  const limit = section.limit ?? 4;
  const supplement =
    fromPool.length < limit
      ? await fetchPostsByCategorySlug("guide", limit * 3).catch(() => emptyPosts)
      : emptyPosts;

  const seen = new Set<number>(excludeIds);
  const posts: PostListItem[] = [];
  for (const post of [...fromPool, ...supplement]) {
    if (seen.has(post.id)) continue;
    seen.add(post.id);
    posts.push(post);
    if (posts.length >= limit) break;
  }

  if (posts.length === 0) return null;

  return (
    <HomeSectionShell section={section}>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {posts.map((post) => (
          <ArticleCardStatic key={post.id} post={post} />
        ))}
      </div>
    </HomeSectionShell>
  );
}

/**
 * Occasioni verificate dal price score.
 *
 * Non passa da `HomeSectionShell` perché `BestDealsSection` porta già la propria
 * intestazione e il proprio rimando: incapsularlo produrrebbe due titoli
 * annidati, e un link "vedi tutto" gestito da fuori resterebbe orfano ogni volta
 * che la verifica non promuove nessun prodotto.
 */
function PriceRadarSection() {
  const section = sectionById("price-radar");
  if (!section) return null;
  return (
    <BestDealsSection
      limit={section.limit ?? 4}
      moreHref={section.moreHref}
      moreLabel={section.moreLabel}
    />
  );
}

export default async function HomePage() {
  let initialPosts = emptyPosts;
  let totalPages = 1;
  let pagesConsumed = 0;
  let offertePosts = emptyPosts;
  let mostReadPosts = emptyPosts;
  let weekTrendingPosts = emptyPosts;
  let monthTrendingPosts = emptyPosts;
  /**
   * Insieme più ampio dei soli articoli mostrati, usato per misurare il calore
   * degli argomenti.
   *
   * Il `trending` del batch home porta venti articoli in più senza costare una
   * richiesta: su un campione più grande il calore distingue meglio una storia
   * in corso da una coincidenza.
   */
  let signalPool = emptyPosts;

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
      signalPool = homeData.trending ?? emptyPosts;
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

  /**
   * Composizione automatica (§11).
   *
   * `now` è calcolato una volta e passato a tutto: se ogni funzione leggesse
   * l'orologio da sé, freschezza e calore potrebbero riferirsi a istanti diversi
   * dentro lo stesso render.
   */
  const now = Date.now();
  const displayItems = prepareItems(initialPosts);
  const ranked = rankHomeItems(displayItems, { now, overrides: HOME_RANKING_OVERRIDES });
  const rankedPosts = ranked.map((item) => item.post);

  // Il calore si misura sull'insieme allargato; l'ordinamento riguarda solo ciò
  // che si mostra.
  const seenInPool = new Set(initialPosts.map((post) => post.id));
  const heatItems = [
    ...displayItems,
    ...prepareItems(signalPool.filter((post) => !seenInPool.has(post.id))),
  ];

  const heroSection = sectionById("hero");
  const heroCount = heroSection?.limit ?? 4;
  const heroIds = new Set(rankedPosts.slice(0, heroCount).map((post) => post.id));

  const spotlightSection = sectionById("spotlight");
  const spotlightSlug = spotlightSection ? hottestTopicSlug(heatItems, now) : null;
  const spotlightTopic = spotlightSlug ? getTopic(spotlightSlug) : undefined;
  const spotlightPosts = spotlightTopic
    ? displayItems
        .filter(
          (item) =>
            !heroIds.has(item.post.id) &&
            item.classification.topics.some((topic) => topic.slug === spotlightTopic.slug),
        )
        .slice(0, spotlightSection?.limit ?? 4)
        .map((item) => item.post)
    : [];

  const trafficUsable = hasUsableTrafficSignal(
    [...initialPosts, ...mostReadPosts, ...signalPool],
    { now },
  );
  const topics = trafficUsable ? [] : hotTopics(heatItems, now, { limit: 6 });

  /**
   * La griglia non ripete ciò che lo speciale mostra già.
   *
   * L'apertura resta intatta (i primi `heroCount`), mentre gli articoli finiti
   * nello speciale escono dal flusso cronologico: senza questo filtro gli stessi
   * tre titoli comparivano due volte nella stessa schermata, verificato al primo
   * render. `consumedPosts` conserva l'elenco completo, così "carica altri"
   * riprende dalla pagina giusta.
   */
  const spotlightIds = new Set(spotlightPosts.map((post) => post.id));
  const displayedPosts = rankedPosts.filter(
    (post, index) => index < heroCount || !spotlightIds.has(post.id),
  );

  /** Tutto ciò che è già a schermo: le sezioni successive non lo ripetono. */
  const shownIds = new Set<number>([
    ...displayedPosts.map((post) => post.id),
    ...spotlightIds,
  ]);

  return (
    <>
      <HomeContent
        initialPosts={displayedPosts}
        consumedPosts={rankedPosts}
        initialTotalPages={totalPages}
        initialPagesConsumed={pagesConsumed}
        offertePosts={offertePosts}
        mostReadPosts={mostReadPosts}
        weekTrendingPosts={weekTrendingPosts}
        monthTrendingPosts={monthTrendingPosts}
        breakingSlot={<BreakingBar entry={activeBreaking(now)} />}
        beforeGridSlot={
          spotlightTopic && spotlightPosts.length > 0 ? (
            <TopicSpotlight topic={spotlightTopic} posts={spotlightPosts} />
          ) : null
        }
        /**
         * La classifica di lettura cede il posto agli argomenti caldi quando il
         * contatore non misura abbastanza da ordinare qualcosa. Non è un
         * ripiego: "più letti" costruito su differenze di una o due letture
         * sarebbe un'informazione falsa.
         */
        rankingsSlot={topics.length > 0 ? <HotTopicsSidebar topics={topics} /> : undefined}
        afterGridSlot={
          <>
            {/*
              Ogni sezione che carica dati sta in `Suspense`: senza, la home
              attenderebbe la più lenta prima di mandare al browser anche solo
              l'apertura, che è ciò che determina l'LCP.
            */}
            <Suspense fallback={null}>
              <EvergreenSection pool={displayItems} excludeIds={shownIds} />
            </Suspense>
            {/*
              In `Suspense` perché verifica lo storico di una rosa di prodotti:
              è la sezione più lenta della pagina e non deve trattenere
              l'apertura, che è ciò che determina l'LCP.
            */}
            <Suspense fallback={null}>
              <PriceRadarSection />
            </Suspense>
            <Suspense fallback={null}>
              <CompatibilitySection />
            </Suspense>
          </>
        }
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
