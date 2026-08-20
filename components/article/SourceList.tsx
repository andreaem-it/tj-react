import type { ArticleSource } from "@/lib/content/types";

/**
 * Elenco delle fonti citate nell'articolo (§16-17).
 *
 * Server Component senza stato: sono link `<a>` verso i domini che
 * l'articolo cita già, non un giudizio editoriale su di essi — per questo
 * `rel="noopener"` ma senza `nofollow`: non c'è motivo di negare fiducia a un
 * link che l'articolo stesso ha scelto di inserire.
 */
export default function SourceList({ sources }: { sources: readonly ArticleSource[] }) {
  if (sources.length === 0) return null;

  return (
    <section aria-labelledby="tj-art-fonti" className="mt-8 border-t border-border pt-5">
      <h2
        id="tj-art-fonti"
        className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted"
      >
        {sources.length === 1 ? "Fonte" : "Fonti"}
      </h2>
      <ul className="space-y-1 text-sm">
        {sources.map((source) => (
          <li key={source.url}>
            <a
              href={source.url}
              target="_blank"
              rel="noopener"
              className="text-foreground hover:text-accent hover:underline wrap-anywhere"
            >
              {source.name}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
