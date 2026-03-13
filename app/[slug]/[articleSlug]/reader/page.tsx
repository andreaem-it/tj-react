import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { fetchPostBySlug, getCategoryUrlSlugFromWpSlug } from "@/lib/api";
import ArticleBody from "@/components/ArticleBody";

export const revalidate = 60;

interface ReaderPageProps {
  params: Promise<{ slug: string; articleSlug: string }>;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
}

export async function generateMetadata({ params }: ReaderPageProps) {
  const { articleSlug } = await params;
  const post = await fetchPostBySlug(articleSlug);
  if (post) return { title: `${post.title} | TechJournal` };
  return { title: "Pagina non trovata" };
}

export default async function ReaderPage({ params }: ReaderPageProps) {
  const { slug: categoryUrlSlug, articleSlug } = await params;
  const post = await fetchPostBySlug(articleSlug);
  if (!post) notFound();

  const postCategoryUrlSlug = getCategoryUrlSlugFromWpSlug(post.categorySlug);
  if (categoryUrlSlug !== postCategoryUrlSlug) {
    redirect(`/${postCategoryUrlSlug}/${articleSlug}/reader`);
  }

  const articleHref = `/${postCategoryUrlSlug}/${post.slug}`;

  return (
    <div className="min-h-screen flex flex-col">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between gap-4">
        <Link
          href={articleHref}
          className="text-muted hover:text-accent text-sm font-medium transition-colors"
        >
          ← Torna all&apos;articolo
        </Link>
        <span className="text-muted text-xs">Modalità lettura</span>
      </div>
      <article className="flex-1 w-full max-w-2xl mx-auto px-4 py-8 md:py-12">
        <header className="mb-8">
          <Link
            href={`/${postCategoryUrlSlug}`}
            className="text-accent text-sm font-semibold uppercase tracking-wide hover:underline"
          >
            {post.categoryName}
          </Link>
          <h1 className="text-foreground text-2xl md:text-3xl font-bold mt-2 mb-3 leading-tight">
            {post.title}
          </h1>
          <p className="text-muted text-sm">
            {post.authorName} · {formatDate(post.date)}
          </p>
        </header>
        <div className="article-body-wrapper" data-font-size="1">
          <ArticleBody
            html={post.content}
            viewCount={post.viewCount}
            postId={post.id}
          />
        </div>
      </article>
    </div>
  );
}
