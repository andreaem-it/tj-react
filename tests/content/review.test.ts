import assert from "node:assert/strict";
import { test } from "node:test";
import { hasRealReviewData } from "@/lib/content/review";
import type { PostReview } from "@/lib/api";

function review(overrides: Partial<PostReview> = {}): PostReview {
  return {
    rating: 8.5,
    ratingScale: 10,
    pros: ["Autonomia ottima"],
    cons: ["Prezzo alto"],
    testDuration: "3 settimane",
    methodology: null,
    verdict: null,
    ...overrides,
  };
}

test("undefined/null non è una recensione reale", () => {
  assert.equal(hasRealReviewData(undefined), false);
  assert.equal(hasRealReviewData(null), false);
});

test("un voto valido è una recensione reale", () => {
  assert.equal(hasRealReviewData(review()), true);
});

test("un voto fuori scala non è valido", () => {
  assert.equal(hasRealReviewData(review({ rating: 11 })), false);
  assert.equal(hasRealReviewData(review({ rating: -1 })), false);
});

test("una scala non valida non è una recensione reale", () => {
  assert.equal(hasRealReviewData(review({ ratingScale: 0 })), false);
});

test("un voto non numerico non è una recensione reale", () => {
  assert.equal(hasRealReviewData(review({ rating: Number.NaN })), false);
});
