import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import TjLink from "@/components/TjLink";
import { fetchPostBySlugDetailed, getCategoryUrlSlugFromWpSlug } from "@/lib/api";
import { brandedSeoTitle } from "@/lib/seo";
import { SITE_URL } from "@/lib/constants";
import ArticleBody from "@/components/ArticleBody";
import { enrichArticle } from "@/lib/content/enrich";

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
  // Sanificazione, ancore e link interni lato server, come nella pagina
  // articolo: `ArticleBody` riceve HTML già sicuro e non porta più
  // `sanitize-html` nel bundle del browser.
  const { safeHtml } = enrichArticle({
    title: post.title,
    excerpt: post.excerpt,
    content: post.content,
    categorySlug: post.categorySlug,
    categoryHref: `/${postCategoryUrlSlug}`,
  });

  return (
    <main className="min-h-screen bg-background text-foreground">
      <article className="w-full max-w-3xl mx-auto px-4 py-8 md:px-6 md:py-12">
        <header className="mb-10 border-b border-border pb-8">
          <TjLink href="/" aria-label="TechJournal" className="inline-flex items-center">
            <Image
              src="/techjournal-logo.png"
              alt="TechJournal"
              width={1645}
              height={265}
              className="h-9 w-auto object-contain"
              priority
            />
          </TjLink>
          <h1 className="text-foreground text-3xl md:text-5xl font-bold mt-10 mb-5 leading-tight wrap-anywhere">
            {post.title}
          </h1>
          {post.excerpt && (
            <p className="text-muted text-lg md:text-xl leading-relaxed wrap-anywhere">
              {post.excerpt}
            </p>
          )}
          <p className="mt-5 text-muted text-sm">{formatDate(post.date)}</p>
          <TjLink
            href={articleHref}
            className="mt-5 inline-flex min-h-10 items-center text-sm font-medium text-accent hover:underline"
          >
            Torna all&apos;articolo completo
          </TjLink>
        </header>
        <div className="article-body-wrapper" data-font-size="1">
          <ArticleBody safeHtml={safeHtml} postId={post.id} />
        </div>
      </article>
    </main>
  );
}
