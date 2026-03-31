import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/compatibility/StatusBadge";
import { ExperienceBadge } from "@/components/compatibility/ExperienceBadge";
import { SupportTypeBadge } from "@/components/compatibility/SupportTypeBadge";
import { parseStatus } from "@/lib/compatibility/filters";
import { fetchOsDetail } from "@/lib/compatibility/serverApi";
import type { CompatibilityStatus } from "@/lib/compatibility/types";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS: { value: CompatibilityStatus | ""; label: string }[] = [
  { value: "", label: "Tutti" },
  { value: "supported", label: "Supportato" },
  { value: "partial", label: "Parziale" },
  { value: "unsupported", label: "Non supportato" },
  { value: "community", label: "Community" },
];

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ status?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await fetchOsDetail(decodeURIComponent(slug));
  if (!data) return { title: "OS" };
  return {
    title: `${data.os.name} · compatibilità dispositivi`,
    description: `Dispositivi compatibili con ${data.os.name}.`,
  };
}

export default async function OsCompatibilityPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const status = parseStatus(sp.status ?? null);
  const data = await fetchOsDetail(decodeURIComponent(slug), status ? { status } : undefined);
  if (!data) notFound();

  const { os, rows } = data;

  const base = `/compatibility/os/${encodeURIComponent(os.slug)}`;

  return (
    <div className="w-full max-w-4xl py-8 px-2 sm:px-0">
      <nav className="text-sm text-[var(--muted)] mb-4">
        <Link href="/compatibility" className="hover:text-[var(--foreground)]">
          Compatibilità
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[var(--foreground)]">{os.name}</span>
      </nav>

      <header className="mb-8">
        <h1 className="text-2xl font-bold">{os.name}</h1>
        <dl className="mt-4 flex flex-wrap gap-6 text-sm">
          {os.releaseYear != null && (
            <div>
              <dt className="text-[var(--muted)]">Anno</dt>
              <dd>{os.releaseYear}</dd>
            </div>
          )}
          <div>
            <dt className="text-[var(--muted)]">Tipo</dt>
            <dd className="uppercase">{os.type}</dd>
          </div>
          {os.isFuture && (
            <div>
              <span className="rounded bg-amber-500/20 text-amber-100 px-2 py-0.5 text-xs">
                Futuro / beta
              </span>
            </div>
          )}
        </dl>
      </header>

      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <span className="text-sm text-[var(--muted)]">Filtra per stato:</span>
        {STATUS_OPTIONS.map((o) => {
          const href =
            o.value === ""
              ? base
              : `${base}?status=${encodeURIComponent(o.value)}`;
          const active = (status ?? "") === o.value;
          return (
            <Link
              key={o.value || "all"}
              href={href}
              className={`rounded-lg border px-2.5 py-1 text-xs transition border-[var(--border)] ${
                active
                  ? "bg-[var(--accent)]/20 border-[var(--accent)]"
                  : "hover:bg-[var(--surface-overlay)]"
              }`}
            >
              {o.label}
            </Link>
          );
        })}
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full min-w-[640px] text-sm text-left">
          <thead className="bg-[var(--sidebar-bg)] text-[var(--muted)]">
            <tr>
              <th className="p-3 font-medium">Dispositivo</th>
              <th className="p-3 font-medium">Esito</th>
              <th className="p-3 font-medium">Tipo</th>
              <th className="p-3 font-medium">Esperienza</th>
              <th className="p-3 font-medium">Note</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-4 text-[var(--muted)]">
                  Nessun dispositivo per questo filtro.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-[var(--border)]">
                  <td className="p-3">
                    <Link
                      href={`/compatibility/device/${encodeURIComponent(row.device.slug)}`}
                      className="font-medium hover:text-[var(--accent)]"
                    >
                      {row.device.name}
                    </Link>
                    <span className="block text-xs text-[var(--muted)]">{row.device.type}</span>
                  </td>
                  <td className="p-3">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="p-3">
                    <SupportTypeBadge type={row.supportType} />
                  </td>
                  <td className="p-3">
                    <ExperienceBadge level={row.experience} />
                  </td>
                  <td className="p-3 text-[var(--muted)] max-w-xs">{row.notes || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
