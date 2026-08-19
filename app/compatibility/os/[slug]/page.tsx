import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import { StatusBadge } from "@/components/compatibility/StatusBadge";
import { ExperienceBadge } from "@/components/compatibility/ExperienceBadge";
import { SupportTypeBadge } from "@/components/compatibility/SupportTypeBadge";
import { parseStatus } from "@/lib/compatibility/filters";
import { fetchOsDetail } from "@/lib/compatibility/serverApi";
import {
  analyzeOsSupport,
  describeOsSupport,
  describePredictions,
} from "@/lib/compatibility/insights";
import type { CompatibilityStatus, OsDetailPayload } from "@/lib/compatibility/types";
import { SITE_URL } from "@/lib/constants";

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
  if (!data?.os) return { title: "Sistema operativo non trovato", robots: { index: false, follow: false } };

  const insight = analyzeOsSupport(data.rows ?? []);
  const canonical = `${SITE_URL.replace(/\/$/, "")}/compatibility/os/${encodeURIComponent(slug)}`;

  /**
   * Titolo e descrizione dai dati reali: prima erano "iOS 26.4 · compatibilità
   * dispositivi" e "Dispositivi compatibili con iOS 26.4", cioè la stessa frase
   * su ogni versione e senza il numero che il lettore sta cercando.
   */
  const title =
    insight.supportedCount > 0
      ? `Quali dispositivi supportano ${data.os.name}`
      : `${data.os.name}: dispositivi compatibili`;
  const description =
    describeOsSupport(data.os, insight) ?? `Dispositivi compatibili con ${data.os.name}.`;

  return {
    title: { absolute: `${title} | TechJournal` },
    description,
    // Canonical senza query: ?status= è un filtro, non una pagina distinta.
    alternates: { canonical },
    openGraph: { title, description, url: canonical, siteName: "TechJournal", type: "website" },
  };
}

export default async function OsCompatibilityPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const status = parseStatus(sp.status ?? null);
  const data = await fetchOsDetail(decodeURIComponent(slug), status ? { status } : undefined);
  if (!data?.os) notFound();

  const { os, rows: rowsRaw } = data as OsDetailPayload;
  const rows = rowsRaw ?? [];

  const base = `/compatibility/os/${encodeURIComponent(os.slug)}`;

  /**
   * L'analisi gira sulle righe **non filtrate**: con `?status=` attivo il
   * riepilogo descriverebbe il filtro invece della versione, e "compatibile con
   * 0 dispositivi" comparirebbe scegliendo "Non supportato".
   */
  const allRows = (await fetchOsDetail(decodeURIComponent(slug)))?.rows ?? rows;
  const insight = analyzeOsSupport(allRows);
  const answer = describeOsSupport(os, insight);
  const predictionsNote = describePredictions(insight.predictedCount, insight.supportedCount);

  return (
    <div className="w-full min-w-0 max-w-4xl py-8 px-2 sm:px-0">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Compatibilità", href: "/compatibility" },
          { label: os.name },
        ]}
      />

      <header className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">{os.name}</h1>
        {answer && <p className="mt-3 max-w-2xl text-base text-foreground">{answer}</p>}
        {predictionsNote && <p className="mt-2 max-w-2xl text-sm text-muted">{predictionsNote}</p>}
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
