import type { FaqEntry } from "@/lib/content/types";

/**
 * Blocco "Domande frequenti" (§37).
 *
 * Le domande sono heading già presenti nell'articolo (vedi
 * `lib/content/faq.ts`): questo componente li ripete in coda solo perché un
 * lettore che scorre la pagina fino in fondo trova un riepilogo, non perché
 * il contenuto sia diverso da quello già letto. Ogni risposta rimanda
 * all'ancora della sezione completa.
 */
export default function Faq({ entries }: { entries: readonly FaqEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <section aria-labelledby="tj-art-faq" className="mt-8 border-t border-border pt-5">
      <h2
        id="tj-art-faq"
        className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted"
      >
        Domande frequenti
      </h2>
      <dl className="space-y-4">
        {entries.map((entry) => (
          <div key={entry.id}>
            <dt className="text-foreground font-medium">{entry.question}</dt>
            <dd className="mt-1 text-sm text-muted">
              {entry.answer}{" "}
              <a
                href={`#${entry.id}`}
                className="inline-flex min-h-11 items-center rounded text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Leggi la sezione completa
              </a>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
