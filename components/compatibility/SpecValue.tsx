import { formatSimpleSpecBadge, translateSpecDisplayString, translateSpecLabel } from "@/lib/compatibility/specs";

/**
 * Valore di una specifica tecnica: boolean, numeri, stringhe, array
 * "semplici", oggetti annidati. Usato dalla scheda dispositivo e dal
 * comparatore — la logica di formattazione è la stessa, cambia solo il
 * contenitore attorno.
 */
export function SpecValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span className="text-[var(--muted)]">—</span>;
  }
  if (typeof value === "boolean") {
    return (
      <span className={value ? "text-[var(--foreground)]" : "text-[var(--muted)]"}>
        {value ? "Sì" : "No"}
      </span>
    );
  }
  if (typeof value === "number") {
    return (
      <span className="tabular-nums text-[var(--article-text)]">
        {Number.isInteger(value) ? value : value.toLocaleString("it-IT", { maximumFractionDigits: 6 })}
      </span>
    );
  }
  if (typeof value === "string") {
    return (
      <span className="break-words text-[var(--article-text)]">
        {translateSpecDisplayString(value)}
      </span>
    );
  }
  if (Array.isArray(value)) {
    const simple = value.every(
      (v) => v === null || typeof v === "string" || typeof v === "number" || typeof v === "boolean",
    );
    if (simple) {
      return (
        <ul className="flex flex-wrap gap-2" role="list">
          {value.map((item, i) => (
            <li
              key={i}
              className="rounded-md border border-[var(--border)] bg-[var(--surface-overlay)] px-2.5 py-1 text-sm text-[var(--article-text)]"
            >
              {formatSimpleSpecBadge(item)}
            </li>
          ))}
        </ul>
      );
    }
    return (
      <pre className="whitespace-pre-wrap break-words rounded-md border border-[var(--border)] bg-[var(--sidebar-bg)] p-2 font-mono text-xs text-[var(--article-text)] overflow-x-auto">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    return (
      <div className="space-y-2 border-l-2 border-[var(--border)] pl-3">
        {Object.entries(o).map(([k, v]) => (
          <div key={k} className="grid gap-0.5 sm:grid-cols-[minmax(0,0.38fr)_minmax(0,1fr)] sm:gap-3">
            <span className="text-xs text-[var(--muted)]">{translateSpecLabel(k)}</span>
            <div className="text-sm">
              <SpecValue value={v} />
            </div>
          </div>
        ))}
      </div>
    );
  }
  return <span className="text-[var(--article-text)]">{String(value)}</span>;
}
