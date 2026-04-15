import Link from "next/link";
import Image from "next/image";
import type { Device, OperatingSystem } from "@/lib/compatibility/types";

function formatSpecLabel(key: string): string {
  const s = key.replace(/_/g, " ").trim();
  if (!s) return key;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function isRedundantSpec(key: string, value: unknown, device: Device): boolean {
  const k = key.toLowerCase();
  if (k === "name" && typeof value === "string" && value.trim() === device.name.trim()) return true;
  if (device.chipset && k === "chipset" && String(value).trim() === device.chipset.trim()) return true;
  return false;
}

function getSpecEntries(device: Device): [string, unknown][] {
  const specs = device.specs;
  if (!specs || Object.keys(specs).length === 0) return [];
  return Object.entries(specs).filter(([key, value]) => !isRedundantSpec(key, value, device));
}

/** Valore specifica: boolean, numeri, stringhe, array “semplici”, oggetti annidati. */
function SpecValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span className="text-[var(--muted)]">—</span>;
  }
  if (typeof value === "boolean") {
    return (
      <span
        className={
          value ? "text-[var(--foreground)]" : "text-[var(--muted)]"
        }
      >
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
    return <span className="break-words text-[var(--article-text)]">{value}</span>;
  }
  if (Array.isArray(value)) {
    const simple = value.every(
      (v) =>
        v === null ||
        typeof v === "string" ||
        typeof v === "number" ||
        typeof v === "boolean",
    );
    if (simple) {
      return (
        <ul className="flex flex-wrap gap-2" role="list">
          {value.map((item, i) => (
            <li
              key={i}
              className="rounded-md border border-[var(--border)] bg-[var(--surface-overlay)] px-2.5 py-1 text-sm text-[var(--article-text)]"
            >
              {item === null ? "—" : String(item)}
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
            <span className="text-xs text-[var(--muted)]">{formatSpecLabel(k)}</span>
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

type Props = {
  device: Device;
  latestSupportedOs: OperatingSystem | null;
};

export function DeviceDetailCard({ device, latestSupportedOs }: Props) {
  const specEntries = getSpecEntries(device);
  const hasSpecs = specEntries.length > 0;

  return (
    <section className="mb-10 rounded-xl border border-[var(--border)] bg-[var(--content-bg)] p-4 sm:p-6">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        {device.imageUrl ? (
          <Image
            src={device.imageUrl}
            alt=""
            width={100}
            height={100}
            sizes="(max-width: 640px) 88px, 100px"
            className="h-auto w-[88px] max-w-[120px] shrink-0 rounded-lg border border-[var(--border)] object-contain sm:w-[100px]"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">{device.name}</h1>
          {(device.releaseYear != null ||
            device.endOfSupportYear != null ||
            device.chipset) && (
            <div className="mt-3 flex flex-wrap gap-x-8 gap-y-2 text-sm">
              {device.releaseYear != null && (
                <div>
                  <span className="text-[var(--muted)]">Anno uscita · </span>
                  <span className="text-[var(--article-text)]">{device.releaseYear}</span>
                </div>
              )}
              {device.endOfSupportYear != null && (
                <div>
                  <span className="text-[var(--muted)]">Fine supporto · </span>
                  <span className="text-[var(--article-text)]">{device.endOfSupportYear}</span>
                </div>
              )}
              {device.chipset && (
                <div>
                  <span className="text-[var(--muted)]">Chipset · </span>
                  <span className="text-[var(--article-text)]">{device.chipset}</span>
                </div>
              )}
            </div>
          )}
          <div className="mt-3 text-sm">
            <span className="text-[var(--muted)]">Ultimo OS supportato · </span>
            {latestSupportedOs ? (
              <Link
                href={`/compatibility/os/${encodeURIComponent(latestSupportedOs.slug)}`}
                className="text-lg font-semibold text-[var(--accent)] hover:underline"
              >
                {latestSupportedOs.name}
              </Link>
            ) : (
              <span className="text-sm text-[var(--muted)]">Nessun dato in matrice per questo dispositivo.</span>
            )}
          </div>
          {device.notes && (
            <p className="mt-4 border-l-2 border-[var(--accent)] pl-3 text-sm text-[var(--article-text)]">
              {device.notes}
            </p>
          )}
        </div>
      </div>

      {hasSpecs && (
        <div className="mt-6 border-t border-[var(--border)] pt-6">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            Specifiche tecniche
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {specEntries.map(([key, value]) => {
              const wideCard =
                (typeof value === "object" &&
                  value !== null &&
                  !Array.isArray(value)) ||
                (Array.isArray(value) && value.length > 4);
              return (
                <div
                  key={key}
                  className={`rounded-lg border border-[var(--border)] bg-[var(--surface-overlay)] p-3 sm:min-h-0 ${wideCard ? "sm:col-span-2" : ""}`}
                >
                  <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                    {formatSpecLabel(key)}
                  </div>
                  <div className="min-w-0">
                    <SpecValue value={value} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
