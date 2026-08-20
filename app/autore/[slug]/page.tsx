import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ArticleCardStatic from "@/components/ArticleCardStatic";
import Breadcrumbs from "@/components/Breadcrumbs";
import TjLink from "@/components/TjLink";
import { fetchAuthorBySlug, fetchPosts } from "@/lib/api";
import { SITE_URL } from "@/lib/constants";
import { sanitizeRichHtml } from "@/lib/sanitizeRichHtml";

/**
 * Pagina autore (§40).
 *
 * Richiede `GET tj/v1/author/:slug` e il filtro `author` su `tj/v1/posts`
 * (`scripts/wp-plugin/techjournal-api`, v1.2.0): finché il plugin in
 * produzione non è aggiornato, ogni slug risponde 404 qui, correttamente —
 * non c'è ancora un profilo da mostrare, non è un bug di questa pagina.
 *
 * Niente `generateStaticParams`: non esiste un endpoint "elenco autori" da
 * cui enumerarli (§26 vale anche al contrario — non si costruisce un elenco
 * finto per avere qualcosa da prerenderizzare). Le pagine si generano on
 * demand alla prima visita e restano poi in cache fino al `revalidate`,
 * raggiunte dai link "Di {autore}" su ogni articolo.
 */
export const revalidate = 3600;
export const dynamicParams = true;

/** Articoli più recenti mostrati: prima pagina soltanto, niente paginazione in questa v1. */
const POSTS_LIMIT = 24;

interface AuthorPageProps {
  params: Promise<{ slug: string }>;
}

const BASE = SITE_URL.replace(/\/$/, "");

export async function generateMetadata({ params }: AuthorPageProps): Promise<Metadata> {
  const { slug } = await params;
  const author = await fetchAuthorBySlug(slug);
  if (!author) {
    return { title: "Autore non trovato", robots: { index: false, follow: false } };
  }

  const canonical = `${BASE}/autore/${author.slug}`;
  const description = author.bio.trim()
    ? author.bio.replace(/\s+/g, " ").trim().slice(0, 300)
    : `Articoli pubblicati da ${author.name} su TechJournal.`;

  return {
    title: { absolute: `${author.name} | TechJournal` },
    description,
    alternates: { canonical },
    openGraph: {
      title: author.name,
      description,
      url: canonical,
      siteName: "TechJournal",
      type: "profile",
    },
    twitter: { card: "summary", title: author.name, description },
  };
}

export default async function AuthorPage({ params }: AuthorPageProps) {
  const { slug } = await params;
  const author = await fetchAuthorBySlug(slug);
  if (!author) notFound();

  const { posts } = await fetchPosts({ authorSlug: author.slug, perPage: POSTS_LIMIT, page: 1 });
  const safeBio = author.bio.trim() ? sanitizeRichHtml(author.bio) : "";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url: `${BASE}/autore/${author.slug}`,
    inLanguage: "it-IT",
    mainEntity: {
      "@type": "Person",
      name: author.name,
      ...(author.avatarUrl && { image: author.avatarUrl }),
      ...(author.bio.trim() && { description: author.bio.trim() }),
      url: `${BASE}/autore/${author.slug}`,
    },
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl px-[5px] py-6 md:px-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="mb-8">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: author.name }]} />
        <div className="mt-3 flex items-start gap-4">
          {author.avatarUrl && (
            <Image
              src={author.avatarUrl}
              alt={author.name}
              width={96}
              height={96}
              sizes="(max-width: 768px) 64px, 96px"
              className="h-16 w-16 shrink-0 rounded-full object-cover md:h-24 md:w-24"
            />
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-foreground md:text-4xl">{author.name}</h1>
            {safeBio && (
              <div
                className="mt-3 max-w-2xl text-base text-muted leading-relaxed [&_p]:mb-2 last:[&_p]:mb-0"
                dangerouslySetInnerHTML={{ __html: safeBio }}
              />
            )}
          </div>
        </div>
      </header>

      {posts.length === 0 ? (
        <p className="py-8 text-muted">
          Nessun articolo pubblicato al momento.{" "}
          <TjLink href="/" className="text-accent hover:underline">
            Torna alla home
          </TjLink>
          .
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post, index) => (
            <ArticleCardStatic key={post.id} post={post} priority={index < 3} />
          ))}
        </div>
      )}
    </div>
  );
}
