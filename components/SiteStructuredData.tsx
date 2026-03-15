import { SITE_URL } from "@/lib/constants";

const LOGO_URL = "https://static.techjournal.it/2024/01/logo-techjournal-250.png";
const base = SITE_URL.replace(/\/$/, "");

/**
 * Schema.org Organization + WebSite (JSON-LD) per SEO.
 * Equivalente a quanto RankMath espone: organizzazione globale e sito con SearchAction per sitelinks search box.
 */
export default function SiteStructuredData() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${base}/#organization`,
        name: "TechJournal",
        url: base,
        logo: {
          "@type": "ImageObject",
          url: LOGO_URL,
        },
      },
      {
        "@type": "WebSite",
        "@id": `${base}/#website`,
        name: "TechJournal",
        url: base,
        publisher: { "@id": `${base}/#organization` },
        inLanguage: "it-IT",
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${base}/search?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
