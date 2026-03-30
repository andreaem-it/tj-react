import Link from "next/link";
import type { Metadata } from "next";
import { parseDeviceType } from "@/lib/compatibility/filters";
import {
  fetchCompatibilityDevices,
  fetchCompatibilityOsList,
} from "@/lib/compatibility/serverApi";
import type { DeviceType } from "@/lib/compatibility/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Compatibilità Apple",
  description:
    "Dispositivi Apple e compatibilità con iOS, iPadOS e macOS: filtra per categoria e consulta le schede.",
};

const TYPE_LABEL: Record<DeviceType, string> = {
  iphone: "iPhone",
  ipad: "iPad",
  mac: "Mac",
};

function TypeFilter({ active }: { active?: DeviceType }) {
  const base =
    "rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm transition hover:bg-[var(--surface-overlay)]";
  const activeCls = "bg-[var(--accent)]/20 border-[var(--accent)] text-[var(--foreground)]";
  return (
    <div className="flex flex-wrap gap-2">
      <Link href="/compatibility" className={`${base} ${!active ? activeCls : ""}`}>
        Tutti
      </Link>
      {(Object.keys(TYPE_LABEL) as DeviceType[]).map((t) => (
        <Link
          key={t}
          href={`/compatibility?type=${t}`}
          className={`${base} ${active === t ? activeCls : ""}`}
        >
          {TYPE_LABEL[t]}
        </Link>
      ))}
    </div>
  );
}

export default async function CompatibilityIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const sp = await searchParams;
  const type = parseDeviceType(sp.type ?? null);
  const devices = await fetchCompatibilityDevices(type);
  const operatingSystems = await fetchCompatibilityOsList();

  const grouped: Record<DeviceType, typeof devices> = {
    iphone: [],
    ipad: [],
    mac: [],
  };
  for (const d of devices) {
    grouped[d.type].push(d);
  }

  const order: DeviceType[] = ["iphone", "ipad", "mac"];
  const showGroups = !type;

  return (
    <div className="w-full max-w-4xl py-8 px-2 sm:px-0">
      <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)] mb-2">
        Compatibilità dispositivi Apple
      </h1>
      <p className="text-[var(--muted)] text-sm mb-6 max-w-2xl">
        Scopri se il tuo dispositivo Apple è compatibile con un sistema operativo, quali sono supportati e quali no.
      </p>

      <TypeFilter active={type} />

      <div className="mt-8 space-y-10">
        {showGroups
          ? order.map((t) => {
              const list = grouped[t];
              if (list.length === 0) return null;
              return (
                <section key={t}>
                  <h2 className="text-lg font-semibold mb-3 border-b border-[var(--border)] pb-2">
                    {TYPE_LABEL[t]}
                  </h2>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {list.map((d) => (
                      <li key={d.id}>
                        <Link
                          href={`/compatibility/device/${encodeURIComponent(d.slug)}`}
                          className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--content-bg)] px-4 py-3 hover:bg-[var(--surface-overlay)] transition"
                        >
                          {d.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={d.imageUrl}
                              alt=""
                              className="h-14 w-14 shrink-0 rounded object-cover border border-[var(--border)] bg-[var(--sidebar-bg)]"
                            />
                          ) : null}
                          <span className="font-medium">{d.name}</span>
                          {d.releaseYear != null && (
                            <span className="block text-xs text-[var(--muted)] mt-0.5">
                              {d.releaseYear}
                              {d.chipset ? ` · ${d.chipset}` : ""}
                            </span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })
          : devices.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-3 border-b border-[var(--border)] pb-2">
                  {type ? TYPE_LABEL[type] : "Risultati"}
                </h2>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {devices.map((d) => (
                    <li key={d.id}>
                      <Link
                        href={`/compatibility/device/${encodeURIComponent(d.slug)}`}
                        className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--content-bg)] px-4 py-3 hover:bg-[var(--surface-overlay)] transition"
                      >
                        {d.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={d.imageUrl}
                            alt=""
                            className="h-14 w-14 shrink-0 rounded object-cover border border-[var(--border)] bg-[var(--sidebar-bg)]"
                          />
                        ) : null}
                        <span className="font-medium">{d.name}</span>
                        {d.releaseYear != null && (
                          <span className="block text-xs text-[var(--muted)] mt-0.5">
                            {d.releaseYear}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

        {devices.length === 0 && (
          <p className="text-[var(--muted)] text-sm">
            Nessun dispositivo in elenco. I dati si gestiscono dal pannello TechJournal Admin (voce
            Compatibilità).
          </p>
        )}
      </div>

      <div className="mt-12 pt-6 border-t border-[var(--border)]">
        <h2 className="text-sm font-semibold text-[var(--muted)] mb-2">Sistemi operativi</h2>
        {operatingSystems.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Nessun OS definito.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {operatingSystems.slice(0, 32).map((os) => (
              <li key={os.id}>
                <Link
                  href={`/compatibility/os/${encodeURIComponent(os.slug)}`}
                  className="inline-block rounded border border-[var(--border)] px-2 py-1 text-xs hover:bg-[var(--surface-overlay)]"
                >
                  {os.name}
                </Link>
              </li>
            ))}
            {operatingSystems.length > 32 && (
              <li className="text-xs text-[var(--muted)] self-center">…</li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
