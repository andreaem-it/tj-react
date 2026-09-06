import type { FaqEntry } from "@/lib/content/types";

/**
 * `FAQPage` (§37, §39).
 *
 * Google ha ristretto nel 2023 il rich result FAQ ai soli siti governativi e
 * sanitari: qui il markup resta comunque corretto, perché è la
 * rappresentazione machine-readable di un blocco che è già visibile e reale
 * in pagina (`components/article/Faq.tsx`), non un tentativo di ottenere uno
 * snippet che per questo sito non comparirà.
 */
export default function FaqStructuredData({ entries }: { entries: readonly FaqEntry[] }) {
  if (entries.length === 0) return null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: entries.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: entry.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
