import type { HistoryRange } from "./types";

export function parseHistoryRangeParam(raw: string | null): HistoryRange {
  const v = (raw ?? "30d").toLowerCase();
  if (v === "7d" || v === "30d" || v === "90d" || v === "max") return v;
  return "30d";
}
