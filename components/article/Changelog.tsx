import type { ChangelogEntry } from "@/lib/api";

function formatDayMonthYear(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Data di modifica e, se compilata, cronologia di cosa è cambiato (§19,
 * §35-36).
 *
 * Senza `updatedIso` non mostra nulla, come già faceva il progetto: senza
 * una data non c'è niente da dire su quando l'articolo è stato rivisto.
 * Senza voci di changelog mostra solo la data — esattamente il comportamento
 * di prima di questo componente. Le voci, quando ci sono, aggiungono il
 * "cosa" a un "quando" che il sito sapeva già dire.
 */
export default function Changelog({
  updatedIso,
  entries,
}: {
  updatedIso: string | null;
  entries?: readonly ChangelogEntry[];
}) {
  if (!updatedIso) return null;

  const list = entries ?? [];
  if (list.length === 0) {
    return (
      <p className="mt-3 text-sm text-muted">
        Aggiornato il{" "}
        <time dateTime={updatedIso} className="text-foreground">
          {formatDayMonthYear(updatedIso)}
        </time>
      </p>
    );
  }

  const [latest, ...previous] = list;

  return (
    <div className="mt-3 text-sm text-muted">
      <p>
        Aggiornato il{" "}
        <time dateTime={updatedIso} className="text-foreground">
          {formatDayMonthYear(updatedIso)}
        </time>
        {latest.note && <>: {latest.note}</>}
      </p>
      {previous.length > 0 && (
        <details className="mt-1">
          <summary className="flex min-h-11 cursor-pointer items-center rounded text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
            Cronologia aggiornamenti
          </summary>
          <ul className="mt-2 space-y-2">
            {previous.map((entry) => (
              <li key={entry.date}>
                <time dateTime={entry.date} className="text-foreground">
                  {formatDayMonthYear(entry.date)}
                </time>
                {entry.note && <> — {entry.note}</>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
