import type { SupportType } from "@/lib/compatibility/types";

/**
 * Natura del dato di compatibilità: constatato, previsto o non ufficiale.
 *
 * `predicted` era etichettato **"Documentato"**, cioè l'opposto di ciò che è. Non
 * è un caso limite: nel database reale otto righe su trentaquattro di iOS 26.4
 * sono previsioni, e presentarle come documentate significa dare per verificata
 * una supposizione su prodotti non ancora usciti — esattamente ciò che il
 * progetto non deve fare.
 */
const MAP: Record<SupportType, { label: string; hint: string; className: string }> = {
  official: {
    label: "Ufficiale",
    hint: "Compatibilità dichiarata dal produttore",
    className: "border-border bg-surface-overlay text-muted",
  },
  predicted: {
    label: "Previsto",
    hint: "Previsione non confermata dal produttore: può cambiare",
    className:
      "border-amber-600/40 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  },
  opencore: {
    label: "OpenCore",
    hint: "Supporto non ufficiale, ottenuto con strumenti di terze parti",
    className: "border-sky-600/40 bg-sky-500/10 text-sky-800 dark:text-sky-300",
  },
};

export function SupportTypeBadge({ type }: { type: SupportType }) {
  const item = MAP[type];
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium ${item.className}`}
      title={item.hint}
    >
      <span aria-hidden>{item.label}</span>
      {/* Il badge da solo è ambiguo per chi usa uno screen reader: l'etichetta
          resta breve, la spiegazione viaggia nel testo alternativo. */}
      <span className="sr-only">{item.hint}</span>
    </span>
  );
}
