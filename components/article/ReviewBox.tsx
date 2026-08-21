import type { PostReview } from "@/lib/api";
import { hasRealReviewData } from "@/lib/content/review";

/**
 * Box recensione (§47): voto, pro/contro, metodologia, verdetto.
 *
 * Mostra solo i campi che una persona ha davvero compilato — niente sezioni
 * vuote, niente "N/D". `hasRealReviewData` è il cancello: senza un voto
 * valido il componente non renderizza nulla, anche se il resto dei campi
 * fosse popolato.
 */
export default function ReviewBox({ review }: { review: PostReview | null | undefined }) {
  if (!hasRealReviewData(review)) return null;

  const { rating, ratingScale, pros, cons, testDuration, methodology, verdict } = review;

  return (
    <section
      aria-labelledby="tj-art-review"
      className="mt-8 rounded-lg border border-border bg-surface-overlay p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="tj-art-review" className="text-xs font-semibold uppercase tracking-wide text-muted">
          Il nostro voto
        </h2>
        <p className="text-2xl font-bold text-foreground">
          {rating.toLocaleString("it-IT", { maximumFractionDigits: 1 })}
          <span className="text-base font-normal text-muted">/{ratingScale}</span>
        </p>
      </div>

      {(pros.length > 0 || cons.length > 0) && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {pros.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-foreground">Pro</h3>
              <ul className="mt-1 space-y-1 text-sm text-muted">
                {pros.map((pro) => (
                  <li key={pro} className="flex gap-2">
                    <span aria-hidden className="text-emerald-600 dark:text-emerald-400">
                      +
                    </span>
                    {pro}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {cons.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-foreground">Contro</h3>
              <ul className="mt-1 space-y-1 text-sm text-muted">
                {cons.map((con) => (
                  <li key={con} className="flex gap-2">
                    <span aria-hidden className="text-amber-600 dark:text-amber-400">
                      –
                    </span>
                    {con}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {verdict && <p className="mt-4 font-medium text-foreground">{verdict}</p>}

      {(testDuration || methodology) && (
        <p className="mt-4 border-t border-border pt-3 text-xs text-muted">
          {testDuration && <>Testato per {testDuration}. </>}
          {methodology}
        </p>
      )}
    </section>
  );
}
