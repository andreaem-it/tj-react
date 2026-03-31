import type { SupportType } from "@/lib/compatibility/types";

const MAP: Record<SupportType, string> = {
  official: "Ufficiale",
  predicted: "Documentato",
  opencore: "OpenCore",
};

export function SupportTypeBadge({ type }: { type: SupportType }) {
  return (
    <span className="rounded bg-[var(--surface-overlay)] px-1.5 py-0.5 text-xs text-[var(--muted)]">
      {MAP[type]}
    </span>
  );
}
