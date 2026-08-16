import { notFound, redirect } from "next/navigation";
import TjLink from "@/components/TjLink";
import { fetchPostBySlugDetailed, getCategoryUrlSlugFromWpSlug } from "@/lib/api";
import { brandedSeoTitle } from "@/lib/seo";
import { SITE_URL } from "@/lib/constants";
import ArticleBody from "@/components/ArticleBody";

/** Allineato alla pagina articolo: le modifiche non hanno un webhook. */
export const revalidate = 900;

interface ReaderPageProps {
  params: Promise<{ slug: string; articleSlug: string }>;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
}

export async function generateMetadata({ params }: ReaderPageProps) {
  const { articleSlug } = await params;
  const result = await fetchPostBySlugDetailed(articleSlug);
  // `absolute`: senza, il template "%s | TechJournal" del layout raddoppia il brand.
  if (result.status === "found") {
    const { post } = result;
    // Questa è una vista alternativa dello stesso articolo: senza canonical
    // sarebbe contenuto duplicato per l'intero archivio. Punta alla pagina
    // articolo, così i segnali si consolidano lì.
    const articleUrl = `${SITE_URL.replace(/\/$/, "")}/${getCategoryUrlSlugFromWpSlug(
      post.categorySlug,
    )}/${post.slug}`;
    return {
      title: { absolute: brandedSeoTitle(post.title) },
      alternates: { canonical: articleUrl },
      // Il canonical da solo non è bastato: Google ha indicizzato comunque le
      // varianti /reader (visibili in Search Console con impression proprie,
      // es. /iphone/i-prezzi-dei-nuovi-iphone-14-in-italia/reader). Il canonical
      // è un suggerimento, `noindex` è una direttiva. `follow` resta attivo così
      // i link interni della vista lettura continuano a passare segnali.
      robots: { index: false, follow: true },
    };
  }
  return { title: "Pagina non trovata" };
}

export default async function ReaderPage({ params }: ReaderPageProps) {
  const { slug: categoryUrlSlug, articleSlug } = await params;
  const result = await fetchPostBySlugDetailed(articleSlug);
  // "error" = errore transitorio: non emettere 404, lascia che Next.js usi la pagina
  // di errore o ritenti al prossimo revalidate.
  if (result.status === "not_found") notFound();
  if (result.status === "error") throw new Error("Upstream error fetching post");
  const post = result.post;

  const postCategoryUrlSlug = getCategoryUrlSlugFromWpSlug(post.categorySlug);
  if (categoryUrlSlug !== postCategoryUrlSlug) {
    redirect(`/${postCategoryUrlSlug}/${articleSlug}/reader`);
  }

  const articleHref = `/${postCategoryUrlSlug}/${post.slug}`;

  return (
    <div className="min-h-screen flex flex-col">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-2 py-3 md:px-4 flex items-center justify-between gap-4">
        <TjLink
          href={articleHref}
          className="text-muted hover:text-accent text-sm font-medium transition-colors"
        >
          ← Torna all&apos;articolo
        </TjLink>
        <span className="text-muted text-xs">Modalità lettura</span>
      </div>
      <article className="flex-1 w-full max-w-2xl mx-auto px-2 md:px-4 py-8 md:py-12">
        <header className="mb-8">
          <TjLink
            href={`/${postCategoryUrlSlug}`}
            className="text-accent text-sm font-semibold uppercase tracking-wide hover:underline"
          >
            {post.categoryName}
          </TjLink>
          <h1 className="text-foreground text-2xl md:text-3xl font-bold mt-2 mb-3 leading-tight">
            {post.title}
          </h1>
          <p className="text-muted text-sm">
            {post.authorName} · {formatDate(post.date)}
          </p>
        </header>
        <div className="article-body-wrapper" data-font-size="1">
          <ArticleBody html={post.content} postId={post.id} />
        </div>
      </article>
    </div>
  );
}
