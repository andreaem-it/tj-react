import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import TjLink from "@/components/TjLink";
import {
  fetchMostReadPosts,
  fetchPostBySlugDetailed,
  fetchPosts,
  fetchRelatedPosts,
  fetchTrendingWeekAndMonth,
  getCategoryUrlSlugFromWpSlug,
  type PostWithMeta,
} from "@/lib/api";
import ShareButtons from "@/components/ShareButtons";
import ArticleBody from "@/components/ArticleBody";
import Breadcrumbs from "@/components/Breadcrumbs";
import ArticleStructuredData from "@/components/ArticleStructuredData";
import { ArticleRelatedPosts, ArticleSidebar } from "@/components/ArticlePageExtras";
import InlineBannerPlaceholder from "@/components/InlineBannerPlaceholder";
import { BLUR_DATA_URL, SITE_URL } from "@/lib/constants";
import { postModifiedIso } from "@/lib/postDates";
import type { Metadata } from "next";

export const revalidate = 300;
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
  const description = post.excerpt?.slice(0, 160) || post.title;
  const image = post.imageUrl || `${SITE_URL}/og-default.png`;
  const modifiedIso = postModifiedIso(post);

  return {
    title: `${post.title} | TechJournal`,
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

/** Fallback per errori transitori dell'API (post fetch fallito ≠ post inesistente). */
function ArticleUnavailable() {
  return (
    <div className="max-w-3xl mx-auto py-16 px-4 text-center">
      <h1 className="text-2xl font-bold text-foreground mb-2">Articolo non disponibile</h1>
      <p className="text-muted mb-6">
        Il contenuto non è raggiungibile in questo momento. Riprova tra poco.
      </p>
      <TjLink href="/" className="text-accent hover:underline font-medium">
        Torna alla home
      </TjLink>
    </div>
  );
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug: categoryUrlSlug, articleSlug } = await params;
  const result = await fetchPostBySlugDetailed(articleSlug);
  // Post inesistente: 404 vero (evita soft-404 indicizzati).
  if (result.status === "not_found") notFound();
  // Errore transitorio upstream: pagina di cortesia, no-index via generateMetadata.
  if (result.status === "error") return <ArticleUnavailable />;
  const post = result.post;

  const postCategoryUrlSlug = getCategoryUrlSlugFromWpSlug(post.categorySlug);
  if (categoryUrlSlug !== postCategoryUrlSlug) {
    redirect(`/${postCategoryUrlSlug}/${articleSlug}`);
  }

  const articleHref = `/${postCategoryUrlSlug}/${post.slug}`;
  // Stesso formato del canonical (senza trailing slash): evita URL duplicati in condivisione.
  const shareUrl = `${SITE_URL.replace(/\/$/, "")}${articleHref}`;
  const modifiedIso = postModifiedIso(post);
  const sidebarAdSlot = process.env.NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE_SIDEBAR;

  // Correlati e trending caricati lato server (RSC): dati corretti per categoria
  // e per visualizzazioni, niente fetch client di /api/posts/1.
  const [relatedPosts, mostReadPosts, trendingFallback] = await Promise.all([
    fetchRelatedPosts({ baseSlug: post.slug, categoryId: post.categoryId }).catch(
      () => [] as PostWithMeta[]
    ),
    fetchMostReadPosts({ limit: 9 }).catch(() => [] as PostWithMeta[]),
    // Pre-fetch in parallelo: usato solo se mostReadPosts è vuoto (nessun dato di view).
    fetchTrendingWeekAndMonth({ limit: 9 }).catch(() => ({
      week: [] as PostWithMeta[],
      month: [] as PostWithMeta[],
    })),
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
        url={articleHref}
      />
      <div className="flex flex-col lg:flex-row gap-8">
        <article className="flex-1 min-w-0 w-full max-w-full bg-content-bg rounded-lg overflow-hidden">
          <header className="w-full max-w-full min-w-0 px-3 pt-6 pb-4 md:p-8 box-border">
            <Breadcrumbs items={breadcrumbItems} />
            <TjLink
              href={`/${postCategoryUrlSlug}`}
              className="text-muted text-sm font-semibold uppercase tracking-wide hover:underline wrap-anywhere max-w-full"
            >
              {post.categoryName}
            </TjLink>
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
                <TjLink href="/chi-siamo" className="hover:underline text-foreground">
                  {post.authorName}
                </TjLink>
              </span>
              <time dateTime={post.date}>{formatDate(post.date)}</time>
              <ShareButtons title={post.title} url={shareUrl} variant="light" />
            </div>

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
            <ArticleBody html={post.content} postId={post.id} />
            <InlineBannerPlaceholder
              width="100%"
              height={90}
              className="mb-0"
              adSlot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE_TOP}
              adFormat="horizontal"
              fullWidthResponsive={false}
            />
          </div>
          <ArticleRelatedPosts posts={relatedPosts} />
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
