import type { TocEntry } from "@/lib/content/types";

/**
 * Indice dei contenuti (§16).
 *
 * Server Component senza stato: sono ancore HTML native, quindi funzionano
 * senza JavaScript, senza idratazione e senza scroll-spy. Lo scorrimento morbido
 * e l'offset per l'header sticky sono gestiti in CSS (`app/globals.css`).
 *
 * Niente `position: sticky`: su questo layout la colonna dell'articolo è larga
 * e la sidebar è già occupata da trending e pubblicità. Un indice appiccicato
 * avrebbe richiesto uno scroll-spy in JavaScript per non risultare disorientante,
 * a fronte di un indice che ha tipicamente da tre a otto voci — cioè si legge
 * tutto in una volta.
 */
export default function TableOfContents({ entries }: { entries: readonly TocEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <nav
      aria-labelledby="tj-toc-title"
      className="my-6 rounded-lg border border-border bg-surface-overlay px-4 py-3"
    >
      <h2
        id="tj-toc-title"
        className="text-xs font-semibold uppercase tracking-wide text-muted"
      >
        In questo articolo
      </h2>
      <ol className="mt-2 space-y-1 text-sm">
        {entries.map((entry) => (
          <li key={entry.id} className={entry.level === 3 ? "pl-4" : undefined}>
            <a
              href={`#${entry.id}`}
              className="text-foreground hover:text-accent hover:underline wrap-anywhere"
            >
              {entry.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
