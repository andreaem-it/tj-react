import TjLink from "@/components/TjLink";
import { topicHref } from "@/lib/content/topics";
import type { Topic } from "@/lib/content/types";

export interface HotTopic {
  topic: Topic;
  /** Articoli recenti che trattano l'argomento. */
  count: number;
}

/**
 * Argomenti di cui si sta parlando, in sostituzione della classifica di lettura.
 *
 * Prende il posto di "Più letti" quando il contatore di visualizzazioni non ha
 * abbastanza dati per ordinare qualcosa. Non è un ripiego decorativo: è
 * un'informazione che deriva da un dato che possediamo davvero — quanti articoli
 * recenti trattano un argomento — al posto di una classifica costruita su
 * differenze di una o due letture.
 *
 * Server Component: nessuna scheda da idratare, a differenza della sidebar delle
 * classifiche che è `"use client"` per via delle tab.
 */
export default function HotTopicsSidebar({ topics }: { topics: readonly HotTopic[] }) {
  if (topics.length === 0) return null;

  return (
    <aside
      className="w-full shrink-0 rounded-surface bg-sidebar-bg p-panel lg:w-[320px]"
      aria-labelledby="tj-hot-topics"
    >
      <h2
        id="tj-hot-topics"
        className="mb-4 border-b border-border pb-3 text-sm font-bold uppercase tracking-wide text-foreground"
      >
        Se ne sta parlando
      </h2>
      <ul className="divide-y divide-border">
        {topics.map(({ topic, count }) => {
          const href = topicHref(topic);
          if (!href) return null;
          return (
            <li key={topic.slug} className="py-3 first:pt-0 last:pb-0">
              <TjLink href={href} className="group flex items-baseline justify-between gap-3">
                <span className="min-w-0 font-semibold text-foreground group-hover:text-accent">
                  {topic.name}
                </span>
                <span className="shrink-0 text-xs text-muted">
                  {count} {count === 1 ? "articolo" : "articoli"}
                </span>
              </TjLink>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
