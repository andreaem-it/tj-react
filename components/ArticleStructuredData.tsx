import { SITE_URL } from "@/lib/constants";
import { topicHref } from "@/lib/content/topics";
import type { ContentType, Topic } from "@/lib/content/types";

const BASE = SITE_URL.replace(/\/$/, "");
const LOGO_URL = `${BASE}/techjournal-logo.png`;

/**
 * Tipo Schema.org corrispondente al formato editoriale.
 *
 * `NewsArticle` va usato per ciò che è legato all'attualità; una guida o un
 * confronto sono `Article`, perché non sono notizie e dichiararli tali
 * comunicherebbe a Google una freschezza che quei contenuti non hanno (e non
 * devono avere: vivono di traffico evergreen).
 *
 * `Review` non compare in questa tabella deliberatamente. Richiede
 * `reviewRating`, e un rating generato automaticamente sarebbe un dato inventato
 * su un contenuto che nessuno ha provato (§39, §89). Le recensioni vere lo
 * riceveranno quando esisterà il modello dati con voto, metodologia e durata del
 * test compilati da una persona.
 */
const SCHEMA_TYPE: Record<ContentType, "NewsArticle" | "Article"> = {
  news: "NewsArticle",
  deal: "NewsArticle",
  guide: "Article",
  comparison: "Article",
  "deep-dive": "Article",
  review: "Article",
};

interface ArticleStructuredDataProps {
  headline: string;
  description?: string;
  imageUrl: string | null;
  datePublished: string;
  dateModified?: string;
  authorName: string;
  /** Slug WordPress dell'autore (§40): se assente, l'URL ricade su `/chi-siamo`. */
  authorSlug?: string;
  url: string;
  contentType?: ContentType;
  /** Sezione editoriale, cioè il nome della categoria. */
  section?: string;
  /** Argomenti dell'articolo: diventano `about`, con l'URL della loro pagina. */
  topics?: readonly Topic[];
  /** Parole del corpo. Omesso se zero: `wordCount: 0` sarebbe un dato falso. */
  wordCount?: number;
  /** Minuti di lettura, resi come durata ISO 8601. */
  readingMinutes?: number;
}

export default function ArticleStructuredData({
  headline,
  description,
  imageUrl,
  datePublished,
  dateModified,
  authorName,
  authorSlug,
  url,
  contentType = "news",
  section,
  topics,
  wordCount,
  readingMinutes,
}: ArticleStructuredDataProps) {
  const fullUrl = url.startsWith("http") ? url : `${BASE}${url.startsWith("/") ? "" : "/"}${url}`;

  /**
   * `about` solo per gli argomenti che hanno una pagina.
   *
   * Un `Thing` senza `@id` è un'affermazione priva di verifica; con l'URL
   * dell'hub o dell'archivio diventa un nodo che il crawler può seguire, ed è
   * esattamente il collegamento entità → pagina su cui si regge la SEO
   * entity-driven (§69).
   */
  const about = (topics ?? [])
    .map((topic) => ({ topic, href: topicHref(topic) }))
    .filter((item): item is { topic: Topic; href: string } => item.href !== null)
    .map(({ topic, href }) => ({
      "@type": "Thing",
      "@id": `${BASE}${href}`,
      name: topic.name,
      url: `${BASE}${href}`,
    }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": SCHEMA_TYPE[contentType],
    headline,
    ...(description && { description }),
    ...(imageUrl && {
      image: {
        "@type": "ImageObject",
        url: imageUrl,
      },
    }),
    datePublished,
    ...(dateModified && { dateModified }),
    inLanguage: "it-IT",
    ...(section && { articleSection: section }),
    ...(about.length > 0 && { about }),
    ...(wordCount != null && wordCount > 0 && { wordCount }),
    ...(readingMinutes != null && readingMinutes > 0 && { timeRequired: `PT${readingMinutes}M` }),
    isAccessibleForFree: true,
    author: {
      "@type": "Person",
      name: authorName,
      url: authorSlug ? `${BASE}/autore/${authorSlug}` : `${BASE}/chi-siamo`,
    },
    publisher: {
      "@type": "Organization",
      name: "TechJournal",
      url: BASE,
      logo: {
        "@type": "ImageObject",
        url: LOGO_URL,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": fullUrl,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
