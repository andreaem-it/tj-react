import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import TjLink from "@/components/TjLink";
import {
  fetchAuthorBySlug,
  fetchMostReadPosts,
  fetchPostBySlugDetailed,
  fetchPosts,
  fetchTrendingWeekAndMonth,
  getCategoryUrlSlugFromWpSlug,
  type PostWithMeta,
} from "@/lib/api";
import ShareButtons from "@/components/ShareButtons";
import ArticleBody from "@/components/ArticleBody";
import AuthorCard from "@/components/AuthorCard";
import Changelog from "@/components/article/Changelog";
import TLDR from "@/components/article/TLDR";
import Breadcrumbs from "@/components/Breadcrumbs";
import ArticleStructuredData from "@/components/ArticleStructuredData";
import { ArticleRelatedPosts, ArticleSidebar } from "@/components/ArticlePageExtras";
import InlineBannerPlaceholder from "@/components/InlineBannerPlaceholder";
import ArticleTopics from "@/components/article/ArticleTopics";
import Faq from "@/components/article/Faq";
import FaqStructuredData from "@/components/article/FaqStructuredData";
import ReliabilityBadge from "@/components/article/ReliabilityBadge";
import ReviewBox from "@/components/article/ReviewBox";
import SourceList from "@/components/article/SourceList";
import SaveArticleButton from "@/components/personal/SaveArticleButton";
import TableOfContents from "@/components/article/TableOfContents";
import { BLUR_DATA_URL, SITE_URL } from "@/lib/constants";
import { articleUpdatedIso, postModifiedIso } from "@/lib/postDates";
import { brandedSeoTitle, seoDescription } from "@/lib/seo";
import { CONTENT_TYPE_LABEL } from "@/lib/content/classify";
import { enrichArticle } from "@/lib/content/enrich";
import { shouldRenderToc } from "@/lib/content/toc";
import ProductPriceCard from "@/components/priceRadar/ProductPriceCard";
import { loadArticleProducts } from "@/lib/priceRadar/articleProducts";
import StoryTimelineSection from "@/components/article/StoryTimeline";
import { loadArticleRelated } from "@/lib/content/articleRelated";
import type { Metadata } from "next";
import ArticleAudioPlayer from "@/components/article/ArticleAudioPlayer";
import { isFeatureEnabled } from "@/lib/featureFlags";

/**
 * Volutamente più basso di home e categorie (3600s).
 *
 * Il webhook WP scatta solo alla prima pubblicazione
 * (`$old_status === 'publish'` esce subito), quindi **le modifiche a un
 * articolo già pubblicato non invalidano nulla**: questo valore è l'unico
 * meccanismo che le fa emergere. Alzabile a 3600 solo dopo aver esteso il
 * plugin WP a notificare anche gli aggiornamenti.
 */
export const revalidate = 900;
export const dynamicParams = true;
export const maxDuration = 60;

export async function generateStaticParams() {
  try {
    const { posts } = await fetchPosts({ perPage: 150, page: 1 });
    return posts.map((post) => ({
      slug: getCategoryUrlSlugFromWpSlug(post.categorySlug),
      articleSlug: post.slug,
    }));
  } catch {
    return [];
  }
}

interface ArticlePageProps {
  params: Promise<{ slug: string; articleSlug: string }>;
}

function authorInitials(name: string): string {
  const t = name.trim();
  if (!t) return "TJ";
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return t.slice(0, 2).toUpperCase();
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  // Clamp a 0: con clock skew (data futura) evita "Pubblicato -3 ore fa".
  const diffMs = Math.max(0, now.getTime() - d.getTime());
  const diffHours = Math.floor(diffMs / 3600000);
  if (diffHours < 24) return `Pubblicato ${diffHours} ore fa`;
  return `Pubblicato il ${d.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}`;
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { articleSlug } = await params;
  const result = await fetchPostBySlugDetailed(articleSlug);
  if (result.status !== "found") {
    // Post inesistente o errore upstream: in entrambi i casi la pagina non va
    // indicizzata (il render restituisce notFound() o ArticleUnavailable).
    return {
      title: result.status === "not_found" ? "Pagina non trovata" : "Articolo non disponibile",
      robots: { index: false, follow: false },
    };
  }
  const post = result.post;

  const path = `/${getCategoryUrlSlugFromWpSlug(post.categorySlug)}/${post.slug}`;
  const canonical = `${SITE_URL.replace(/\/$/, "")}${path}`;
  const description = seoDescription(post.excerpt, post.title);
  const image = post.imageUrl || `${SITE_URL}/og-default.png`;
  const modifiedIso = postModifiedIso(post);

  return {
    title: { absolute: brandedSeoTitle(post.title) },
    description,
    alternates: { canonical },
    openGraph: {
      title: post.title,
      description,
      url: canonical,
      siteName: "TechJournal",
      images: [{ url: image, width: 1200, height: 630, alt: post.imageAlt || post.title }],
      type: "article",
      publishedTime: post.date,
      modifiedTime: modifiedIso,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
      images: [image],
    },
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug: categoryUrlSlug, articleSlug } = await params;
  const result = await fetchPostBySlugDetailed(articleSlug);
  // Post inesistente: 404 vero (evita soft-404 indicizzati).
  if (result.status === "not_found") notFound();
  // Errore transitorio upstream: si lancia, NON si restituisce una pagina di
  // cortesia.
  //
  // Restituire JSX qui era un render "riuscito" per Next, che finiva quindi
  // nel prerender cache e veniva servito come HTTP 200: un blip dell'API
  // congelava un articolo reale su "Articolo non disponibile" per l'intera
  // durata della cache (osservato in produzione su URL linkati dalla home,
  // mentre l'upstream rispondeva 200 correttamente). Per Google era contenuto
  // sottile su un URL indicizzabile.
  //
  // Lanciando, invece: la pagina non viene mai scritta in cache, le versioni
  // già generate continuano a essere servite (stale) e solo le pagine mai
  // generate rispondono 5xx — che i crawler ritentano, a differenza di un 200
  // sbagliato.
  if (result.status === "error") {
    throw new Error(`[Article] fetch upstream fallito per lo slug "${articleSlug}"`);
  }
  const post = result.post;

  const postCategoryUrlSlug = getCategoryUrlSlugFromWpSlug(post.categorySlug);
  if (categoryUrlSlug !== postCategoryUrlSlug) {
    redirect(`/${postCategoryUrlSlug}/${articleSlug}`);
  }

  const articleHref = `/${postCategoryUrlSlug}/${post.slug}`;
  // Stesso formato del canonical (senza trailing slash): evita URL duplicati in condivisione.
  const shareUrl = `${SITE_URL.replace(/\/$/, "")}${articleHref}`;
  const modifiedIso = postModifiedIso(post);
  const updatedIso = articleUpdatedIso(post);
  const categoryHref = `/${postCategoryUrlSlug}`;
  const sidebarAdSlot = process.env.NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE_SIDEBAR;

  /**
   * Un'unica passata sul contenuto, lato server: sanitizzazione, testo semplice,
   * conteggio parole, tempo di lettura, topic, ancore degli heading e link
   * interni. Il risultato entra nella cache di pagina insieme all'HTML, quindi
   * il costo si paga una volta per rigenerazione e non per visita.
   */
  const enrichment = enrichArticle({
    title: post.title,
    excerpt: post.excerpt,
    content: post.content,
    categorySlug: post.categorySlug,
    categoryHref,
  });

  // Correlati e trending caricati lato server (RSC): dati corretti per categoria
  // e per visualizzazioni, niente fetch client di /api/posts/1.
  const [articleRelated, mostReadPosts, trendingFallback, articleProducts, authorProfile] =
    await Promise.all([
      /**
       * Correlati e sviluppi della storia, ordinati per argomenti in comune.
       *
       * Sostituisce `fetchRelatedPosts`, che restituiva "stessa categoria,
       * ordinati per numero di letture": su un contatore che in produzione vale
       * fra 0 e 5 quell'ordine era casuale, e la categoria escludeva proprio gli
       * articoli più pertinenti — nel campione reale cinque pezzi su iPhone 18
       * stanno in quattro categorie diverse.
       */
      loadArticleRelated({
        post,
        topics: enrichment.topics,
      }).catch(() => ({ related: [] as PostWithMeta[], byTopic: false, story: null })),
      fetchMostReadPosts({ limit: 9 }).catch(() => [] as PostWithMeta[]),
      // Pre-fetch in parallelo: usato solo se mostReadPosts è vuoto (nessun dato di view).
      fetchTrendingWeekAndMonth({ limit: 9 }).catch(() => ({
        week: [] as PostWithMeta[],
        month: [] as PostWithMeta[],
      })),
      // Nella stessa `Promise.all` e non dopo: aggiungere una richiesta in serie
      // al percorso critico dell'articolo per un riquadro accessorio sarebbe uno
      // scambio pessimo. Se fallisce, l'articolo si rende senza.
      loadArticleProducts({
        contentHtml: post.content,
        articleTopics: enrichment.topics,
      }).catch(() => []),
      // `authorSlug` è assente finché il plugin non è aggiornato (§40): in quel
      // caso `fetchAuthorBySlug` risponde `null` e il box "Scritto da" non
      // compare, invece di rompere il render.
      (post.authorSlug ? fetchAuthorBySlug(post.authorSlug) : Promise.resolve(null)).catch(
        () => null,
      ),
    ]);
  const trendingPosts = mostReadPosts.length > 0 ? mostReadPosts : trendingFallback.month;

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: post.categoryName, href: `/${postCategoryUrlSlug}` },
    { label: post.title },
  ];

  return (
    <div className="max-w-7xl mx-auto w-full min-w-0 py-8">
      <ArticleStructuredData
        headline={post.title}
        description={post.excerpt}
        imageUrl={post.imageUrl}
        datePublished={post.date}
        dateModified={modifiedIso}
        authorName={post.authorName}
        authorSlug={post.authorSlug}
        review={post.review}
        url={articleHref}
        contentType={enrichment.contentType}
        section={post.categoryName}
        topics={enrichment.topics}
        wordCount={enrichment.wordCount}
        readingMinutes={enrichment.readingMinutes}
      />
      <FaqStructuredData entries={enrichment.faq} />
      <div className="flex flex-col lg:flex-row gap-8">
        <article className="flex-1 min-w-0 w-full max-w-full bg-content-bg rounded-lg overflow-hidden">
          <header className="w-full max-w-full min-w-0 px-3 pt-6 pb-4 md:p-8 box-border">
            <Breadcrumbs items={breadcrumbItems} />
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 max-w-full">
              <TjLink
                href={categoryHref}
                className="text-muted text-sm font-semibold uppercase tracking-wide hover:underline wrap-anywhere max-w-full"
              >
                {post.categoryName}
              </TjLink>
              {/* Il formato si dichiara solo quando aggiunge qualcosa: scrivere
                  "Notizia" su una notizia è una tautologia che occupa spazio. */}
              {enrichment.contentType !== "news" && (
                <span className="text-accent-text text-sm font-semibold uppercase tracking-wide">
                  {CONTENT_TYPE_LABEL[enrichment.contentType]}
                </span>
              )}
              <ReliabilityBadge reliability={enrichment.reliability} />
            </div>
            <h1 className="text-foreground text-2xl md:text-4xl font-bold mt-2 mb-3 max-w-3xl wrap-anywhere">
              {post.title}
            </h1>
            <p className="text-muted text-base max-w-2xl wrap-anywhere">{post.excerpt}</p>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted">
              {post.authorAvatarUrl ? (
                <Image
                  src={post.authorAvatarUrl}
                  alt=""
                  width={40}
                  height={40}
                  className="rounded-full object-cover shrink-0"
                />
              ) : (
                <span className="w-10 h-10 rounded-full bg-surface-overlay flex items-center justify-center text-xs font-medium shrink-0">
                  {authorInitials(post.authorName)}
                </span>
              )}
              <span>
                Di{" "}
                <TjLink
                  href={post.authorSlug ? `/autore/${post.authorSlug}` : "/chi-siamo"}
                  className="hover:underline text-foreground"
                >
                  {post.authorName}
                </TjLink>
              </span>
              <time dateTime={post.date}>{formatDate(post.date)}</time>
              {enrichment.readingMinutes > 0 && (
                <span>{enrichment.readingMinutes} min di lettura</span>
              )}
              <ShareButtons title={post.title} url={shareUrl} variant="light" />
              <SaveArticleButton id={post.id} path={articleHref} title={post.title} />
            </div>

            <Changelog updatedIso={updatedIso} entries={post.changelog} />

            {isFeatureEnabled("articleAudio") ? <ArticleAudioPlayer postId={post.id} /> : null}

            {post.imageUrl && (
              <div className="mt-6 relative w-full max-w-3xl aspect-video rounded-lg overflow-hidden bg-content-bg">
                <Image
                  src={post.imageUrl}
                  alt={post.imageAlt || post.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 800px"
                  priority
                  placeholder="blur"
                  blurDataURL={BLUR_DATA_URL}
                />
              </div>
            )}
          </header>

          <div className="px-3 py-6 md:p-8">
            <ReviewBox review={post.review} />
            <TLDR points={post.tldr} />
            {shouldRenderToc(enrichment.toc) && <TableOfContents entries={enrichment.toc} />}
            <ArticleBody safeHtml={enrichment.safeHtml} postId={post.id} />

            {/* Price Radar dentro l'articolo: il prezzo di cui si parla, con la
                media registrata e la valutazione, invece del solo "è in
                offerta". Compare unicamente se il prodotto è davvero associato —
                ASIN citato nel pezzo o argomento specifico in comune. */}
            {articleProducts.length > 0 && (
              <section className="mt-8 border-t border-border pt-5" aria-labelledby="tj-art-prodotti">
                <h2
                  id="tj-art-prodotti"
                  className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted"
                >
                  {articleProducts.length === 1 ? "Prezzo monitorato" : "Prezzi monitorati"}
                </h2>
                <div className="flex flex-col gap-3">
                  {articleProducts.map((entry) => (
                    <ProductPriceCard
                      key={entry.product.id}
                      entry={entry}
                      eyebrow={
                        entry.reason === "topic" && entry.topic ? entry.topic.name : undefined
                      }
                    />
                  ))}
                </div>
              </section>
            )}

            {enrichment.topics.length > 0 && (
              <div className="mt-8 border-t border-border pt-5">
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
                  Argomenti
                </h2>
                <ArticleTopics topics={enrichment.topics} skipHref={categoryHref} />
              </div>
            )}
            <SourceList sources={enrichment.sources} />
            <Faq entries={enrichment.faq} />
            {articleRelated.story && <StoryTimelineSection story={articleRelated.story} />}

            {authorProfile && (
              <div className="mt-8 border-t border-border pt-5">
                <AuthorCard author={authorProfile} />
              </div>
            )}

            <InlineBannerPlaceholder
              width="100%"
              height={90}
              className="mb-0"
              adSlot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE_TOP}
              adFormat="horizontal"
              fullWidthResponsive={false}
            />
          </div>
          <ArticleRelatedPosts
            posts={articleRelated.related}
            byTopic={articleRelated.byTopic}
          />
        </article>

        <ArticleSidebar
          articleSlug={articleSlug}
          trendingPosts={trendingPosts}
          postTitle={post.title}
          shareUrl={shareUrl}
          sidebarAdSlot={sidebarAdSlot}
        />
      </div>
    </div>
  );
}
