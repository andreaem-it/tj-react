import type { PostReview } from "@/lib/api";

/**
 * Vero se il post ha una recensione reale, non un placeholder (§47).
 *
 * `contentType === "review"` (da `classifyContentType`) legge solo il
 * titolo — non sa se qualcuno ha davvero provato il prodotto. Il voto
 * compilato a mano in WordPress è l'unico segnale che lo garantisce: senza,
 * non si mostra alcun box recensione e non si dichiara `Review` a Google
 * (`ArticleStructuredData`), anche su un articolo che si intitola "Recensione".
 */
export function hasRealReviewData(
  review: PostReview | null | undefined,
): review is PostReview {
  return (
    review != null &&
    Number.isFinite(review.rating) &&
    Number.isFinite(review.ratingScale) &&
    review.ratingScale > 0 &&
    review.rating >= 0 &&
    review.rating <= review.ratingScale
  );
}
