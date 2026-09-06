import { RELIABILITY_HINT, RELIABILITY_LABEL } from "@/lib/content/classify";
import type { Reliability } from "@/lib/content/types";

/**
 * Badge di affidabilità dell'informazione (§18).
 *
 * Non compare su tutti gli articoli, ed è una scelta editoriale, non una
 * mancanza: un'etichetta presente ovunque smette di essere informazione e
 * diventa decorazione. `unspecified` non ha etichetta e non produce nulla, così
 * il badge resta un segnale che il lettore nota quando c'è.
 *
 * Le tre classi coprono la distinzione che conta davvero per chi legge di
 * prodotti non ancora annunciati: **è stato detto da chi lo produce**, **lo
 * riporta qualcun altro**, **è un'indiscrezione che può rivelarsi falsa**.
 */

const STYLES: Record<Exclude<Reliability, "unspecified">, string> = {
  // Verde: constatabile. Non usa l'accento di brand, che qui non significherebbe nulla.
  official:
    "border-emerald-600/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
  report: "border-border bg-surface-overlay text-muted",
  // Ambra e non rosso: un rumor non è un errore, è un'informazione da prendere con cautela.
  rumor: "border-amber-600/40 bg-amber-500/10 text-amber-800 dark:text-amber-300",
};

export default function ReliabilityBadge({
  reliability,
  className,
}: {
  reliability: Reliability;
  className?: string;
}) {
  const label = RELIABILITY_LABEL[reliability];
  if (!label) return null;

  const hint = RELIABILITY_HINT[reliability];
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
        STYLES[reliability as Exclude<Reliability, "unspecified">]
      } ${className ?? ""}`}
      title={hint}
    >
      {/* Il badge da solo è ambiguo per chi usa uno screen reader: l'etichetta
          visiva resta breve, la spiegazione completa viaggia nel testo alternativo. */}
      <span aria-hidden>{label}</span>
      <span className="sr-only">{hint}</span>
    </span>
  );
}
