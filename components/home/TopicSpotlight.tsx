import ArticleCardStatic from "@/components/ArticleCardStatic";
import HomeSectionShell from "@/components/home/HomeSectionShell";
import TjLink from "@/components/TjLink";
import type { PostListItem } from "@/lib/api";
import type { Topic } from "@/lib/content/types";

/**
 * "Speciale del momento": l'argomento di cui si sta parlando ora.
 *
 * L'argomento non è scelto a mano ma da `hottestTopicSlug`, che misura quanti
 * articoli recenti lo trattano. Cambia da solo quando cambia l'attualità, ed è
 * il collegamento fra la home e gli hub costruiti nella prima fase: porta il
 * lettore dalla notizia singola alla storia completa.
 *
 * Gli articoli mostrati **non** vengono ricaricati per l'occasione: sono gli
 * stessi già presenti nell'insieme della home, filtrati per argomento. Nessuna
 * richiesta aggiuntiva, e nessun rischio di mostrare in home un articolo che
 * l'hub non conterrebbe.
 */
export default function TopicSpotlight({
  topic,
  posts,
  className,
}: {
  topic: Topic;
  posts: readonly PostListItem[];
  className?: string;
}) {
  if (posts.length === 0) return null;

  return (
    <HomeSectionShell
      className={className}
      section={{
        id: "spotlight",
        title: `Speciale ${topic.name}`,
        subtitle: topic.description,
        moreHref: `/topic/${topic.slug}`,
        moreLabel: "Tutta la storia",
      }}
    >
      <div className="rounded-lg border border-border bg-content-bg p-4 md:p-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {posts.map((post) => (
            <ArticleCardStatic key={post.id} post={post} priority={false} />
          ))}
        </div>
        <p className="mt-4 text-sm">
          <TjLink href={`/topic/${topic.slug}`} className="text-accent hover:underline">
            Cronologia, guide e schede di {topic.name} →
          </TjLink>
        </p>
      </div>
    </HomeSectionShell>
  );
}
