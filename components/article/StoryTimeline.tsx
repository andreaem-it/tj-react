import TjLink from "@/components/TjLink";
import { getCategoryUrlSlugFromWpSlug, type PostListItem } from "@/lib/api";
import type { StoryTimeline as Story } from "@/lib/content/related";

/**
 * Sviluppi della storia a cui appartiene l'articolo (§34).
 *
 * Risponde alla domanda che un lettore si pone leggendo "iOS 27 Beta 6": cosa
 * era successo prima, e cosa è successo dopo. È un'informazione che il sito
 * possiede già — gli articoli precedenti sono in archivio — e che finora nessuna
 * pagina metteva insieme.
 *
 * Compare solo quando la storia esiste davvero: due articoli non sono una
 * storia, e la soglia sta in `buildStoryTimeline`.
 */
function href(post: PostListItem): string {
  return `/${getCategoryUrlSlugFromWpSlug(post.categorySlug)}/${post.slug}`;
}

function formatDay(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Rome",
  });
}

function Entry({ post }: { post: PostListItem }) {
  return (
    <li>
      <TjLink href={href(post)} className="group block">
        <time className="block text-xs uppercase tracking-wide text-muted" dateTime={post.date}>
          {formatDay(post.date)}
        </time>
        <span className="text-sm text-foreground group-hover:text-accent group-hover:underline">
          {post.title}
        </span>
      </TjLink>
    </li>
  );
}

export default function StoryTimelineSection({ story }: { story: Story }) {
  if (story.previous.length === 0 && story.following.length === 0) return null;

  return (
    <section
      className="mt-8 rounded-lg border border-border bg-surface-overlay p-4 md:p-5"
      aria-labelledby="tj-story"
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="tj-story" className="text-sm font-semibold uppercase tracking-wide text-muted">
          Gli sviluppi su {story.topic.name}
        </h2>
        <TjLink href={`/topic/${story.topic.slug}`} className="text-sm text-accent hover:underline">
          {story.total} articoli →
        </TjLink>
      </div>

      {story.following.length > 0 && (
        <>
          <p className="mb-2 text-xs font-semibold text-muted">Dopo questo articolo</p>
          <ol className="mb-4 space-y-2 border-l border-border pl-3">
            {story.following.map((post) => (
              <Entry key={post.id} post={post} />
            ))}
          </ol>
        </>
      )}

      {story.previous.length > 0 && (
        <>
          <p className="mb-2 text-xs font-semibold text-muted">Prima di questo articolo</p>
          <ol className="space-y-2 border-l border-border pl-3">
            {story.previous.map((post) => (
              <Entry key={post.id} post={post} />
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
