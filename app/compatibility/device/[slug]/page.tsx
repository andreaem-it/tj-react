import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/compatibility/StatusBadge";
import { ExperienceBadge } from "@/components/compatibility/ExperienceBadge";
import { SupportTypeBadge } from "@/components/compatibility/SupportTypeBadge";
import { fetchDeviceDetail } from "@/lib/compatibility/serverApi";

export const dynamic = "force-dynamic";

const TYPE_LABEL = { iphone: "iPhone", ipad: "iPad", mac: "Mac" } as const;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await fetchDeviceDetail(decodeURIComponent(slug));
  if (!data) return { title: "Dispositivo" };
  const u = data.device.imageUrl;
  return {
    title: `${data.device.name} · compatibilità`,
    description: `Compatibilità OS per ${data.device.name} (${TYPE_LABEL[data.device.type]}).`,
    ...(u ? { openGraph: { images: [{ url: u }] } } : {}),
  };
}

export default async function DeviceCompatibilityPage({ params }: Props) {
  const { slug } = await params;
  const data = await fetchDeviceDetail(decodeURIComponent(slug));
  if (!data) notFound();

  const { device, latestSupportedOs, rows } = data;

  return (
    <div className="w-full max-w-4xl py-8 px-2 sm:px-0">
      <nav className="text-sm text-[var(--muted)] mb-4">
        <Link href="/compatibility" className="hover:text-[var(--foreground)]">
          Compatibilità
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[var(--foreground)]">{device.name}</span>
      </nav>

      <header className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-start gap-6">
          {device.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={device.imageUrl}
              alt=""
              style={{ maxWidth: 75, width: "100%", height: "auto", flexShrink: 0 }}
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold">{device.name}</h1>
            <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              {device.releaseYear != null && (
                <div>
                  <dt className="text-[var(--muted)]">Anno uscita</dt>
                  <dd>{device.releaseYear}</dd>
                </div>
              )}
              {device.endOfSupportYear != null && (
                <div>
                  <dt className="text-[var(--muted)]">Fine supporto</dt>
                  <dd>{device.endOfSupportYear}</dd>
                </div>
              )}
              {device.chipset && (
                <div className="sm:col-span-2">
                  <dt className="text-[var(--muted)]">Chipset</dt>
                  <dd>{device.chipset}</dd>
                </div>
              )}
            </dl>
            {device.notes && (
              <p className="mt-4 text-sm text-[var(--article-text)] border-l-2 border-[var(--accent)] pl-3">
                {device.notes}
              </p>
            )}
          </div>
        </div>
      </header>

      <section className="mb-10 rounded-lg border border-[var(--border)] bg-[var(--content-bg)] p-4">
        <h2 className="text-sm font-semibold text-[var(--muted)] mb-2">Ultimo OS supportato</h2>
        {latestSupportedOs ? (
          <p>
            <Link
              href={`/compatibility/os/${encodeURIComponent(latestSupportedOs.slug)}`}
              className="text-lg font-medium text-[var(--accent)] hover:underline"
            >
              {latestSupportedOs.name}
            </Link>
          </p>
        ) : (
          <p className="text-sm text-[var(--muted)]">
            Nessun dato in matrice per questo dispositivo.
          </p>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Tabella compatibilità</h2>
        <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
          <table className="w-full min-w-[640px] text-sm text-left">
            <thead className="bg-[var(--sidebar-bg)] text-[var(--muted)]">
              <tr>
                <th className="p-3 font-medium">OS</th>
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
                    Nessun dato. Usa il pannello admin per collegare OS a questo dispositivo.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-t border-[var(--border)]">
                    <td className="p-3">
                      <Link
                        href={`/compatibility/os/${encodeURIComponent(row.os.slug)}`}
                        className="font-medium text-[var(--foreground)] hover:text-[var(--accent)]"
                      >
                        {row.os.name}
                      </Link>
                      {row.os.releaseYear != null && (
                        <span className="block text-xs text-[var(--muted)]">{row.os.releaseYear}</span>
                      )}
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
                    <td className="p-3 text-[var(--muted)] max-w-xs">
                      {row.notes || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
