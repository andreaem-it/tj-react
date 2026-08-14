import { SITE_URL } from "@/lib/constants";

const BASE = SITE_URL.replace(/\/$/, "");
const LOGO_URL = `${BASE}/techjournal-logo.png`;

interface ArticleStructuredDataProps {
  headline: string;
  description?: string;
  imageUrl: string | null;
  datePublished: string;
  dateModified?: string;
  authorName: string;
  url: string;
}

export default function ArticleStructuredData({
  headline,
  description,
  imageUrl,
  datePublished,
  dateModified,
  authorName,
  url,
}: ArticleStructuredDataProps) {
  const fullUrl = url.startsWith("http") ? url : `${BASE}${url.startsWith("/") ? "" : "/"}${url}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
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
    author: {
      "@type": "Person",
      name: authorName,
      url: `${BASE}/chi-siamo`,
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
