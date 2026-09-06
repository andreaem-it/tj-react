import PriceRatingBadge from "@/components/priceRadar/PriceRatingBadge";
import type { WindowStats } from "@/lib/priceRadar/history";
import {
  describePriceRating,
  formatEuro,
  formatPercent,
  type PriceRating,
} from "@/lib/priceRadar/rating";

/**
 * Stato del prezzo di un prodotto: prezzo, scarto dalla media, valutazione.
 *
 * Server Component unico per tutti i contesti (§6) — pagina prodotto, card della
 * lista, riquadro dentro l'articolo, futura homepage — perché è esattamente lo
 * stesso giudizio: quattro implementazioni separate divergerebbero, e la prima a
 * divergere sarebbe la soglia sotto cui si dice "ottimo prezzo".
 *
 * Le tre varianti cambiano quanto si mostra, mai come si calcola:
 *
 * - `compact`: prezzo e badge. Per le griglie.
 * - `inline`: aggiunge lo scarto dalla media. Per il riquadro negli articoli.
 * - `full`: aggiunge la frase esplicativa. Per la pagina prodotto.
 */

export type PriceStatusVariant = "compact" | "inline" | "full";

interface PriceStatusProps {
  currentPrice: number | null;
  currency?: string;
  rating: PriceRating;
  stats: WindowStats | null;
  variant?: PriceStatusVariant;
  className?: string;
}

const PRICE_SIZE: Record<PriceStatusVariant, string> = {
  compact: "text-xl",
  inline: "text-2xl",
  full: "text-3xl md:text-4xl",
};

export default function PriceStatus({
  currentPrice,
  currency = "EUR",
  rating,
  stats,
  variant = "compact",
  className,
}: PriceStatusProps) {
  const description = variant === "full" ? describePriceRating(rating, stats, currency) : null;
  const showDelta = variant !== "compact";

  return (
    <div className={className}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {currentPrice != null && currentPrice > 0 ? (
          <span className={`font-bold text-foreground ${PRICE_SIZE[variant]}`}>
            {formatEuro(currentPrice, currency)}
          </span>
        ) : (
          // Il prezzo può mancare davvero (prodotto non più disponibile, feed
          // incompleto): si dichiara invece di mostrare "0 €" o "NaN".
          <span className={`font-bold text-muted ${PRICE_SIZE[variant]}`}>Prezzo non disponibile</span>
        )}
        <PriceRatingBadge rating={rating} size={variant === "compact" ? "sm" : "md"} />
      </div>

      {showDelta && stats?.average != null && rating.discountVsAverage != null && (
        <p className="mt-1 text-sm text-muted">
          <span
            className={
              rating.discountVsAverage > 0 ? "font-semibold text-emerald-700 dark:text-emerald-400" : ""
            }
          >
            {formatPercent(rating.discountVsAverage)}
          </span>{" "}
          rispetto alla media di {formatEuro(stats.average, currency)}
        </p>
      )}

      {description && <p className="mt-3 max-w-prose text-sm text-muted">{description}</p>}
    </div>
  );
}
