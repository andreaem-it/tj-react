type Props = { specs: Record<string, unknown> | null | undefined };

export function DeviceSpecsSection({ specs }: Props) {
  if (!specs || Object.keys(specs).length === 0) return null;
  return (
    <section className="mb-10 rounded-lg border border-[var(--border)] bg-[var(--content-bg)] p-4">
      <h2 className="text-sm font-semibold text-[var(--muted)] mb-3">Specifiche tecniche</h2>
      <dl className="divide-y divide-[var(--border)]">
        {Object.entries(specs).map(([key, value]) => (
          <div
            key={key}
            className="grid gap-1 py-2 sm:grid-cols-[minmax(0,0.35fr)_minmax(0,1fr)] sm:gap-4"
          >
            <dt className="text-[var(--muted)] text-sm capitalize">{key.replace(/_/g, " ")}</dt>
            <dd className="text-sm break-words">
              {typeof value === "object" && value !== null ? (
                <pre className="whitespace-pre-wrap font-mono text-xs text-[var(--article-text)] overflow-x-auto">
                  {JSON.stringify(value, null, 2)}
                </pre>
              ) : (
                String(value ?? "—")
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
