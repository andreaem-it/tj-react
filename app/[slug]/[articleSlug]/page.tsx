import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  fetchPostBySlug,
  fetchPostBySlugRaw,
  fetchPosts,
  fetchRelatedPosts,
  getCategoryUrlSlugFromWpSlug,
  getViewCountFromPost,
} from "@/lib/api";
import ShareButtons from "@/components/ShareButtons";
import TrendingSidebar from "@/components/TrendingSidebar";
import AuthorCard from "@/components/AuthorCard";
import ArticleBody from "@/components/ArticleBody";
import RelatedArticlesSlider from "@/components/RelatedArticlesSlider";
import Breadcrumbs from "@/components/Breadcrumbs";
import ArticleStructuredData from "@/components/ArticleStructuredData";
import { BLUR_DATA_URL } from "@/lib/constants";
import InlineBannerPlaceholder from "@/components/InlineBannerPlaceholder";

export const revalidate = 60;

interface ArticlePageProps {
  params: Promise<{ slug: string; articleSlug: string }>;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffHours = Math.floor(diffMs / 3600000);
  if (diffHours < 24) return `Pubblicato ${diffHours} ore fa`;
  return `Pubblicato il ${d.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}`;
}

export async function generateMetadata({ params }: ArticlePageProps) {
  const { articleSlug } = await params;
  const post = await fetchPostBySlug(articleSlug);
  if (post) return { title: `${post.title} | TechJournal` };
  return { title: "Pagina non trovata" };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug: categoryUrlSlug, articleSlug } = await params;
  const post = await fetchPostBySlug(articleSlug);
  if (!post) notFound();

  const postCategoryUrlSlug = getCategoryUrlSlugFromWpSlug(post.categorySlug);
  if (categoryUrlSlug !== postCategoryUrlSlug) {
    redirect(`/${postCategoryUrlSlug}/${articleSlug}`);
  }

  const [allPosts, rawPost, relatedPosts] = await Promise.all([
    fetchPosts({ perPage: 15 }).then((r) => r.posts),
    fetchPostBySlugRaw(articleSlug),
    fetchRelatedPosts({ baseSlug: articleSlug, categoryId: post.categoryId, limit: 12 }),
  ]);
  const authorRaw = rawPost?._embedded?.author?.[0];
  const author =
    authorRaw &&
    typeof authorRaw === "object" &&
    "name" in authorRaw &&
    typeof (authorRaw as { name?: string }).name === "string" &&
    (authorRaw as { avatar_urls?: Record<string, string> }).avatar_urls?.["96"]
      ? authorRaw
      : null;
  const articleHref = `/${postCategoryUrlSlug}/${post.slug}`;
  const shareUrl = `https://www.techjournal.it${articleHref}/`;

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: post.categoryName, href: `/${postCategoryUrlSlug}` },
    { label: post.title },
  ];

  const heroContent = (
    <div className="relative z-10 flex flex-col items-center text-center px-4 py-8 md:py-12 w-full">
      <div className="w-full flex justify-center mb-4">
        <Breadcrumbs items={breadcrumbItems} />
      </div>
      <Link
        href={`/${postCategoryUrlSlug}`}
        className="text-muted text-sm font-semibold uppercase tracking-wide hover:underline"
      >
        {post.categoryName}
      </Link>
      <h1 className="text-foreground text-2xl md:text-4xl font-bold mt-1 mb-2 max-w-3xl">
        {post.title}
      </h1>
      <p className="text-muted text-base max-w-2xl">{post.excerpt}</p>

      <div className="mt-6 w-full flex flex-wrap items-center justify-between gap-4 px-2">
        <div className="flex flex-wrap items-center gap-3 min-w-0">
          {post.authorAvatarUrl ? (
            <Image
              src={post.authorAvatarUrl}
              alt=""
              width={40}
              height={40}
              className="rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-surface-overlay flex items-center justify-center text-muted text-sm font-medium shrink-0">
              {post.authorName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="text-left">
            <p className="text-foreground text-sm font-medium">Di {post.authorName}</p>
            <p className="text-muted text-sm">{formatDate(post.date)}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 justify-end">
          <ShareButtons title={post.title} url={shareUrl} variant="light" />
          <Link
            href={`/${postCategoryUrlSlug}/${post.slug}/reader`}
            className="text-muted hover:text-accent text-sm font-medium transition-colors whitespace-nowrap"
          >
            Modalità lettura
          </Link>
        </div>
      </div>

      {post.imageUrl && (
        <div className="mt-6 w-full max-w-3xl relative aspect-video rounded-lg overflow-hidden bg-content-bg">
          <Image
            src={post.imageUrl}
            alt={post.imageAlt}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 800px"
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
          />
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-2.5 md:px-4 py-8">
      <ArticleStructuredData
        headline={post.title}
        description={post.excerpt}
        imageUrl={post.imageUrl}
        datePublished={post.date}
        dateModified={post.date}
        authorName={post.authorName}
        url={articleHref}
      />
      <div className="flex flex-col lg:flex-row gap-8">
        <article className="flex-1 min-w-0 bg-content-bg rounded-lg overflow-hidden">
          {post.imageUrl ? (
            <header className="relative min-h-[340px] md:min-h-[400px] flex flex-col justify-end rounded-t-lg overflow-hidden pb-6">
              <Image
                src={post.imageUrl}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 800px"
                priority
                placeholder="blur"
                blurDataURL={BLUR_DATA_URL}
              />
              <div className="absolute inset-0 bg-black/80" />
              {heroContent}
            </header>
          ) : (
            <header className="p-6 md:p-8 pb-4">
              {heroContent}
            </header>
          )}

          <div className="p-6 md:p-8 pt-6">
            <ArticleBody html={post.content} viewCount={getViewCountFromPost(rawPost)} postId={post.id} />
            <InlineBannerPlaceholder width="100%" height={90} className="mb-0" />
          </div>
          <footer className="mt-8 pt-6 pb-6 border-t border-border px-6 md:px-8">
            {author ? (
              <div className="p-4 rounded-lg bg-sidebar-bg/50">
                <AuthorCard author={author} />
              </div>
            ) : (
              <div className="flex items-start gap-4 p-4 rounded-lg bg-sidebar-bg/50">
                {post.authorAvatarUrl ? (
                  <Image
                    src={post.authorAvatarUrl}
                    alt={post.authorName}
                    width={96}
                    height={96}
                    className="rounded-full object-cover shrink-0 w-12 h-12 md:w-[96px] md:h-[96px]"
                  />
                ) : (
                  <div className="w-12 h-12 md:w-[96px] md:h-[96px] rounded-full bg-content-bg flex items-center justify-center text-muted text-sm font-medium shrink-0">
                    {post.authorName.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-muted text-sm font-semibold uppercase tracking-wide mb-1">
                    Scritto da
                  </p>
                  <p className="text-foreground font-medium">{post.authorName}</p>
                  <p className="text-muted text-sm mt-2 leading-relaxed">
                    Andrea è uno sviluppatore PHP classe 1990. Appassionato di tecnologia fin da bambino, si evolve nel tempo come programmatore. Amo la tecnologia, è il mio lavoro, il mio pane quotidiano, sono appassionato dei prodotti Apple e di tutto ciò che ruota attorno all&apos;ecosistema.
                  </p>
                </div>
              </div>
            )}
            {relatedPosts.length > 0 && (
              <RelatedArticlesSlider posts={relatedPosts} />
            )}
          </footer>
        </article>
        <aside className="w-full lg:w-[320px] shrink-0">
          <InlineBannerPlaceholder width="100%" height={250} className="mb-4 mx-auto block text-center" />
          <TrendingSidebar
            posts={allPosts}
            currentSlug={articleSlug}
            currentPost={{ title: post.title, shareUrl }}
          />
        </aside>
      </div>
    </div>
  );
}