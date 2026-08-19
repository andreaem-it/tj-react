import type { CompatibilityStatus } from "@/lib/compatibility/types";

/**
 * Esito della compatibilità.
 *
 * I colori erano fissati sul tema scuro (`text-emerald-200` su fondo chiarissimo
 * in tema chiaro): illeggibili con il tema chiaro attivo. Ora il testo usa una
 * tinta scura di base e passa a quella chiara solo in `dark`, come già fanno i
 * badge di affidabilità degli articoli e del price score.
 */
const STYLE: Record<CompatibilityStatus, { label: string; className: string }> = {
  supported: {
    label: "Supportato",
    className:
      "border-emerald-600/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
  },
  unsupported: {
    label: "Non supportato",
    className: "border-red-600/40 bg-red-500/10 text-red-800 dark:text-red-300",
  },
  partial: {
    label: "Parziale",
    className: "border-amber-600/40 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  },
  community: {
    label: "Community",
    className: "border-sky-600/40 bg-sky-500/10 text-sky-800 dark:text-sky-300",
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
