import type { PriceLevel, PriceRating } from "@/lib/priceRadar/rating";
import { INSUFFICIENT_DATA_LABEL } from "@/lib/priceRadar/rating";

/**
 * Badge del price score.
 *
 * A differenza del badge di affidabilità degli articoli, questo si mostra
 * **anche** quando la risposta è "non lo so": "Dati insufficienti" è
 * un'informazione che il lettore deve vedere prima di decidere, non un'assenza
 * da nascondere. Un prodotto senza badge sembrerebbe semplicemente non valutato.
 */

const LEVEL_STYLE: Record<PriceLevel, string> = {
  // Il minimo storico è l'unico caso che merita il colore pieno: se tutto è
  // evidenziato, niente lo è.
  "historical-low":
    "border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-500 dark:text-emerald-950",
  excellent:
    "border-emerald-600/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
  good: "border-sky-600/40 bg-sky-500/10 text-sky-800 dark:text-sky-300",
  average: "border-border bg-surface-overlay text-muted",
  // Ambra e non rosso: un prezzo alto non è un errore, è un'indicazione ad
  // aspettare.
  high: "border-amber-600/40 bg-amber-500/10 text-amber-800 dark:text-amber-300",
};

const INSUFFICIENT_STYLE = "border-border bg-surface-overlay text-muted";

const SIZE_STYLE = {
  sm: "px-2 py-0.5 text-[11px]",
  md: "px-3 py-1 text-xs",
} as const;

export default function PriceRatingBadge({
  rating,
  size = "md",
  className,
}: {
  rating: PriceRating;
  size?: keyof typeof SIZE_STYLE;
  className?: string;
}) {
  const style = rating.level ? LEVEL_STYLE[rating.level] : INSUFFICIENT_STYLE;
  const label = rating.level ? rating.label : INSUFFICIENT_DATA_LABEL;

  return (
    <span
      className={`inline-flex items-center rounded border font-semibold uppercase tracking-wide ${style} ${SIZE_STYLE[size]} ${className ?? ""}`}
    >
      {label}
      {/* La confidenza bassa non merita un badge separato — sarebbe un secondo
          elemento grafico per una sfumatura — ma non può nemmeno restare
          implicita. */}
      {rating.confidence === "low" && (
        <span className="ml-1 font-normal normal-case opacity-80">· storico limitato</span>
      )}
    </span>
  );
}
