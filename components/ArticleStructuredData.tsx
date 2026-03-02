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
  const fullUrl = url.startsWith("http") ? url : `https://www.techjournal.it${url}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
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
    author: {
      "@type": "Person",
      name: authorName,
    },
    publisher: {
      "@type": "Organization",
      name: "TechJournal",
      logo: {
        "@type": "ImageObject",
        url: "https://static.techjournal.it/2024/01/logo-techjournal-250.png",
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
