import type { ExperienceLevel } from "@/lib/compatibility/types";

const MAP: Record<ExperienceLevel, { label: string; className: string }> = {
  excellent: { label: "Eccellente", className: "text-emerald-300" },
  good: { label: "Buona", className: "text-lime-200" },
  limited: { label: "Limitata", className: "text-amber-200" },
  poor: { label: "Scarsa", className: "text-red-300" },
};

export function ExperienceBadge({ level }: { level: ExperienceLevel }) {
  const m = MAP[level];
  return <span className={`text-xs font-medium ${m.className}`}>{m.label}</span>;
}
