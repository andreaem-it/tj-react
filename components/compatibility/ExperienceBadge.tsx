import type { ExperienceLevel } from "@/lib/compatibility/types";

/**
 * Qualità d'uso del sistema operativo su quel dispositivo.
 *
 * Stesse tinte fissate sul tema scuro degli altri badge: `text-lime-200` su
 * fondo bianco è praticamente invisibile. Le varianti chiare restano, ma solo
 * dentro `dark`.
 */
const MAP: Record<ExperienceLevel, { label: string; className: string }> = {
  excellent: { label: "Eccellente", className: "text-emerald-700 dark:text-emerald-300" },
  good: { label: "Buona", className: "text-lime-700 dark:text-lime-300" },
  limited: { label: "Limitata", className: "text-amber-700 dark:text-amber-300" },
  poor: { label: "Scarsa", className: "text-red-700 dark:text-red-300" },
};

export function ExperienceBadge({ level }: { level: ExperienceLevel }) {
  const m = MAP[level];
  return <span className={`text-xs font-medium ${m.className}`}>{m.label}</span>;
}
