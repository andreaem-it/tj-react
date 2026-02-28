import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchPostBySlug, fetchPosts, fetchCategories, fetchPostsByCategorySlug, fetchPostsForInitialDisplay, resolveCategoryByUrlSlug } from "@/lib/api";
import ShareButtons from "@/components/ShareButtons";
import TrendingSidebar from "@/components/TrendingSidebar";
import HomeContent from "@/components/HomeContent";
import OffertePage from "@/components/OffertePage";

export const revalidate = 60;

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ArticlePageProps) {
  const { slug } = await params;
  const post = await fetchPostBySlug(slug);
  if (post) return { title: `${post.title} | TechJournal` };
  const categories = await fetchCategories();
  const cat = resolveCategoryByUrlSlug(categories, slug);
  if (cat) return { title: `${cat.name} | TechJournal` };
  return { title: "Pagina non trovata" };
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffHours = Math.floor(diffMs / 3600000);
  if (diffHours < 24) return `Pubblicato ${diffHours} ore fa`;
  return `Pubblicato il ${d.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}`;
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const post = await fetchPostBySlug(slug);

  if (post) {
    return <ArticleView slug={slug} post={post} />;
  }

  const categories = await fetchCategories();
  const cat = resolveCategoryByUrlSlug(categories, slug);
  if (!cat) notFound();

  if (slug === "offerte") {
    const offertePosts = await fetchPostsByCategorySlug("offerte", 10);
    return <OffertePage posts={offertePosts} />;
  }

  const [
    { posts: initialPosts, totalPages, pagesConsumed },
    offertePosts,
    trendingPosts,
  ] = await Promise.all([
    fetchPostsForInitialDisplay({ categoryId: cat.id, categories }),
    fetchPostsByCategorySlug("offerte", 5),
    fetchPosts({ perPage: 20, page: 1 }).then((r) => r.posts),
  ]);

  return (
    <HomeContent
      initialPosts={initialPosts}
      initialTotalPages={totalPages}
      initialPagesConsumed={pagesConsumed}
      offertePosts={offertePosts}
      trendingPosts={trendingPosts}
      categoryId={cat.id}
    />
  );
}

async function ArticleView({
  slug,
  post,
}: {
  slug: string;
  post: Awaited<ReturnType<typeof fetchPostBySlug>>;
}) {
  const allPosts = await fetchPosts({ perPage: 15 }).then((r) => r.posts);
  if (!post) return null;

  const shareUrl = `https://www.techjournal.it/${post.slug}/`;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="lg:order-first lg:w-[280px] shrink-0 hidden lg:block">
          <TrendingSidebar posts={allPosts} currentSlug={slug} />
        </aside>
        <article className="flex-1 min-w-0 bg-content-bg rounded-lg p-6 md:p-8">
          <Link
            href={`/${post.categorySlug}`}
            className="text-accent text-sm font-semibold uppercase tracking-wide hover:underline"
          >
            {post.categoryName}
          </Link>
          <h1 className="text-white text-2xl md:text-3xl font-bold mt-1 mb-2">
            {post.title}
          </h1>
          <p className="text-muted text-base mb-4">{post.excerpt}</p>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="text-muted text-sm">Condividi</span>
            <ShareButtons title={post.title} url={shareUrl} variant="light" />
          </div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-sidebar-bg flex items-center justify-center text-muted text-sm font-medium">
              AE
            </div>
            <div>
              <p className="text-white text-sm font-medium">By Andrea Emili</p>
              <p className="text-muted text-sm">{formatDate(post.date)}</p>
            </div>
            <div className="ml-auto flex gap-2">
              <ShareButtons title={post.title} url={shareUrl} variant="dark" />
            </div>
          </div>
          {post.imageUrl && (
            <div className="relative w-full aspect-video rounded-lg overflow-hidden mb-6">
              <Image
                src={post.imageUrl}
                alt={post.imageAlt}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 800px"
                priority
              />
            </div>
          )}
          <div
            className="article-content text-muted [&_h2]:text-white [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-6 [&_h2]:mb-2 [&_p]:mb-4 [&_a]:text-accent [&_a]:no-underline hover:[&_a]:underline [&_strong]:text-white"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </article>
      </div>
    </div>
  );
}
