import type { CompatibilityStatus } from "@/lib/compatibility/types";

const STYLE: Record<
  CompatibilityStatus,
  { label: string; className: string }
> = {
  supported: {
    label: "Supportato",
    className: "bg-emerald-600/20 text-emerald-200 border-emerald-500/40",
  },
  unsupported: {
    label: "Non supportato",
    className: "bg-red-600/20 text-red-200 border-red-500/40",
  },
  partial: {
    label: "Parziale",
    className: "bg-amber-500/20 text-amber-100 border-amber-500/40",
  },
  community: {
    label: "Community",
    className: "bg-sky-600/20 text-sky-100 border-sky-500/40",
  },
};

export function StatusBadge({ status }: { status: CompatibilityStatus }) {
  const s = STYLE[status];
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${s.className}`}
    >
      {s.label}
    </span>
  );
}
