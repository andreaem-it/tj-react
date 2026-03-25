import type { PriorityLevel } from "./types";

/** Giorni entro cui un cambio prezzo conta come "recente" per lo score. */
export const RECENT_PRICE_CHANGE_DAYS = 7;

/**
 * score =
 * (views_24h * 1) + (clicks_24h * 3) + (article_mentions * 5) + (manual_boost * 10) +
 * (event_boost * 2) + (recent_price_change ? 15 : 0)
 */
export function computeScore(input: {
  views24h: number;
  clicks24h: number;
  articleMentions: number;
  manualBoost: number;
  eventBoost: number;
  lastPriceChangeAt: string | null;
}): number {
  const now = Date.now();
  let recent = false;
  if (input.lastPriceChangeAt) {
    const t = new Date(input.lastPriceChangeAt).getTime();
    if (!Number.isNaN(t) && now - t < RECENT_PRICE_CHANGE_DAYS * 24 * 60 * 60 * 1000) {
      recent = true;
    }
  }
  return (
    input.views24h * 1 +
    input.clicks24h * 3 +
    input.articleMentions * 5 +
    input.manualBoost * 10 +
    input.eventBoost * 2 +
    (recent ? 15 : 0)
  );
}

export function scoreToPriority(score: number): PriorityLevel {
  if (score >= 40) return "hot";
  if (score >= 15) return "warm";
  return "cold";
}

export function priorityToIntervalMinutes(level: PriorityLevel): number {
  switch (level) {
    case "hot":
      return 180;
    case "warm":
      return 720;
    default:
      return 2880;
  }
}
