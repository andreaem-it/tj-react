import type { PriorityLevel } from "./types";

/**
 * Calcola i minuti fino al prossimo check in base a volatilità (0–1) e priorità.
 * Alta volatilità → intervalli più brevi (circa 1–3h).
 * Media → 6–12h.
 * Bassa → 24–48h.
 */
export function computeNextCheckMinutes(args: {
  volatility: number;
  priorityLevel: PriorityLevel;
}): number {
  const v = Math.min(1, Math.max(0, args.volatility));
  let base: number;
  if (v >= 0.12) {
    base = 60 + Math.floor(Math.random() * 120);
  } else if (v >= 0.04) {
    base = 360 + Math.floor(Math.random() * 360);
  } else {
    base = 1440 + Math.floor(Math.random() * 1440);
  }
  if (args.priorityLevel === "hot") {
    base = Math.floor(base * 0.65);
  } else if (args.priorityLevel === "cold") {
    base = Math.floor(base * 1.15);
  }
  return Math.max(20, Math.min(2880, base));
}
