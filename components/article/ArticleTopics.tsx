import TjLink from "@/components/TjLink";
import { topicHref } from "@/lib/content/topics";
import type { Topic } from "@/lib/content/types";

/**
 * Argomenti dell'articolo (§8).
 *
 * È il punto in cui lo strato semantico diventa visibile e navigabile: da qui il
 * lettore passa dalla singola notizia alla storia completa dell'argomento.
 *
 * Filtra due casi che sarebbero rumore:
 *
 * - i topic senza destinazione (entità utili all'estrazione ma senza pagina);
 * - `skipHref`, cioè l'archivio di categoria dell'articolo, che l'intestazione
 *   linka già nell'occhiello e nel breadcrumb. Una terza chip verso la stessa
 *   pagina occuperebbe uno dei pochi posti disponibili senza aggiungere una
 *   destinazione.
 */
export default function ArticleTopics({
  topics,
  skipHref,
  className,
}: {
  topics: readonly Topic[];
  skipHref?: string;
  className?: string;
}) {
  const items = topics
    .map((topic) => ({ topic, href: topicHref(topic) }))
    .filter((item): item is { topic: Topic; href: string } => item.href !== null)
    .filter((item) => item.href !== skipHref);

  if (items.length === 0) return null;

  return (
    <nav aria-label="Argomenti dell'articolo" className={className}>
      <ul className="flex flex-wrap items-center gap-2">
        {items.map(({ topic, href }) => (
          <li key={topic.slug}>
            <TjLink
              href={href}
              className="inline-flex min-h-11 items-center rounded-full border border-border bg-surface-overlay px-3 py-1 text-xs font-medium text-foreground transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {topic.name}
            </TjLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
