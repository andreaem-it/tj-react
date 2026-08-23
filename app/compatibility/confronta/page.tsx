import Image from "next/image";
import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import TjLink from "@/components/TjLink";
import { SpecValue } from "@/components/compatibility/SpecValue";
import {
  fetchCompatibilityDevices,
  fetchDeviceDetail,
} from "@/lib/compatibility/serverApi";
import { buildSpecComparisonRows } from "@/lib/compatibility/compare";
import type { Device, DeviceType } from "@/lib/compatibility/types";
import { SITE_URL } from "@/lib/constants";

/**
 * Comparatore di dispositivi (§ pillar "comparatori").
 *
 * `force-dynamic`, non `generateStaticParams`: con ~55 dispositivi le coppie
 * possibili sono nell'ordine delle migliaia, e prerenderizzarle — o anche
 * solo indicizzarle — produrrebbe esattamente le pagine doorway sottili che
 * il progetto vieta esplicitamente. `noindex` più sotto è la stessa scelta
 * fatta per `/search`: uno strumento per chi è già sul sito, non un'landing
 * per traffico organico. Se in futuro alcuni confronti specifici ("iPhone 17
 * vs iPhone 18") meritano una pagina indicizzabile propria, è una decisione
 * editoriale — quali coppie, con quale H1 — non qualcosa che si genera da
 * solo per tutte le combinazioni.
 *
 * Le specifiche vengono dalla stessa fonte e con la stessa normalizzazione
 * della scheda dispositivo (`lib/compatibility/specs.ts`,
 * `components/compatibility/SpecValue.tsx`): un lettore che apre prima il
 * confronto e poi la scheda singola vede le stesse etichette.
 */
export const dynamic = "force-dynamic";

const canonical = `${SITE_URL.replace(/\/$/, "")}/compatibility/confronta`;

export const metadata: Metadata = {
  title: "Confronta dispositivi Apple | TechJournal",
  description:
    "Metti a confronto due dispositivi Apple: specifiche tecniche, chipset e ultimo sistema operativo supportato.",
  alternates: { canonical },
  robots: { index: false, follow: true },
};

const TYPE_LABEL: Record<DeviceType, string> = {
  iphone: "iPhone",
  ipad: "iPad",
  mac: "Mac",
};

interface PageProps {
  searchParams: Promise<{ a?: string; b?: string }>;
}

function DevicePicker({
  devices,
  a,
  b,
}: {
  devices: Device[];
  a: string;
  b: string;
}) {
  const byType: Record<DeviceType, Device[]> = { iphone: [], ipad: [], mac: [] };
  for (const d of devices) byType[d.type].push(d);
  const order: DeviceType[] = ["iphone", "ipad", "mac"];

  const options = (
    <>
      <option value="">Scegli un dispositivo…</option>
      {order.map((type) =>
        byType[type].length > 0 ? (
          <optgroup key={type} label={TYPE_LABEL[type]}>
            {byType[type].map((d) => (
              <option key={d.slug} value={d.slug}>
                {d.name}
              </option>
            ))}
          </optgroup>
        ) : null,
      )}
    </>
  );

  return (
    // GET puro: funziona senza JavaScript, submit va a questa stessa pagina
    // con `?a=...&b=...` in query string — nessun componente client per due
    // <select>.
    <form method="get" className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <label className="flex-1 text-sm">
        <span className="mb-1 block text-muted">Primo dispositivo</span>
        <select
          name="a"
          defaultValue={a}
          className="min-h-11 w-full rounded-lg border border-border bg-surface-overlay px-3 py-2 text-foreground focus:border-accent focus:outline-none"
        >
          {options}
        </select>
      </label>
      <label className="flex-1 text-sm">
        <span className="mb-1 block text-muted">Secondo dispositivo</span>
        <select
          name="b"
          defaultValue={b}
          className="min-h-11 w-full rounded-lg border border-border bg-surface-overlay px-3 py-2 text-foreground focus:border-accent focus:outline-none"
        >
          {options}
        </select>
      </label>
      <button
        type="submit"
        className="shrink-0 rounded-lg bg-accent px-5 py-2.5 font-medium text-gray-900 transition-opacity hover:opacity-90"
      >
        Confronta
      </button>
    </form>
  );
}

function DeviceSummary({ device }: { device: Device }) {
  return (
    <div className="flex items-start gap-3">
      {device.imageUrl ? (
        <Image
          src={device.imageUrl}
          alt=""
          width={64}
          height={64}
          sizes="64px"
          className="h-16 w-16 shrink-0 rounded-lg border border-border object-contain"
        />
      ) : null}
      <div className="min-w-0">
        <TjLink
          href={`/compatibility/device/${encodeURIComponent(device.slug)}`}
          className="font-semibold text-foreground hover:text-accent hover:underline"
        >
          {device.name}
        </TjLink>
        <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted">
          {device.releaseYear != null && <span>{device.releaseYear}</span>}
          {device.chipset && <span>{device.chipset}</span>}
        </div>
      </div>
    </div>
  );
}

export default async function CompareDevicesPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const a = (sp.a ?? "").trim();
  const b = (sp.b ?? "").trim();

  const devices = await fetchCompatibilityDevices().catch(() => []);

  let compareBody: React.ReactNode = null;

  if (a && b && a === b) {
    compareBody = (
      <p className="mt-8 text-sm text-muted">
        Scegli due dispositivi diversi per vedere le differenze.
      </p>
    );
  } else if (a && b) {
    const [detailA, detailB] = await Promise.all([
      fetchDeviceDetail(a).catch(() => null),
      fetchDeviceDetail(b).catch(() => null),
    ]);

    if (!detailA || !detailB) {
      compareBody = (
        <p className="mt-8 text-sm text-muted">
          Uno dei due dispositivi scelti non è stato trovato. Riprova dai menu qui sopra.
        </p>
      );
    } else {
      const rows = buildSpecComparisonRows(detailA.device, detailB.device);
      compareBody = (
        <div className="mt-8">
          <div className="grid grid-cols-2 gap-4 sm:gap-8">
            <DeviceSummary device={detailA.device} />
            <DeviceSummary device={detailB.device} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-4 text-sm sm:gap-8">
            <div>
              <span className="text-muted">Ultimo OS supportato · </span>
              {detailA.latestSupportedOs ? (
                <TjLink
                  href={`/compatibility/os/${encodeURIComponent(detailA.latestSupportedOs.slug)}`}
                  className="font-medium text-accent hover:underline"
                >
                  {detailA.latestSupportedOs.name}
                </TjLink>
              ) : (
                <span className="text-muted">—</span>
              )}
            </div>
            <div>
              <span className="text-muted">Ultimo OS supportato · </span>
              {detailB.latestSupportedOs ? (
                <TjLink
                  href={`/compatibility/os/${encodeURIComponent(detailB.latestSupportedOs.slug)}`}
                  className="font-medium text-accent hover:underline"
                >
                  {detailB.latestSupportedOs.name}
                </TjLink>
              ) : (
                <span className="text-muted">—</span>
              )}
            </div>
          </div>

          {rows.length > 0 ? (
            <div className="mt-6 overflow-x-auto">
              <div className="min-w-[520px] rounded-lg border border-border">
                <div className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3 bg-surface-overlay px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  <span>Specifica</span>
                  <span className="truncate">{detailA.device.name}</span>
                  <span className="truncate">{detailB.device.name}</span>
                </div>
                <div className="divide-y divide-border">
                  {rows.map((row) => (
                    <div
                      key={row.key}
                      className={`grid grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3 px-4 py-3 text-sm ${
                        row.differs ? "bg-accent/5" : ""
                      }`}
                    >
                      <span className="text-muted">{row.label}</span>
                      <div className="min-w-0">
                        <SpecValue value={row.a} />
                      </div>
                      <div className="min-w-0">
                        <SpecValue value={row.b} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-6 text-sm text-muted">
              Nessuna delle due schede ha specifiche tecniche registrate da confrontare.
            </p>
          )}
        </div>
      );
    }
  }

  return (
    <div className="w-full min-w-0 max-w-4xl px-2 py-8 sm:px-0">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Compatibilità", href: "/compatibility" },
          { label: "Confronta" },
        ]}
      />
      <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground">
        Confronta due dispositivi
      </h1>
      <p className="mb-6 max-w-2xl text-sm text-muted">
        Specifiche tecniche e ultimo sistema operativo supportato, fianco a fianco. Le righe
        evidenziate sono i valori diversi fra i due.
      </p>

      <DevicePicker devices={devices} a={a} b={b} />

      {compareBody}
    </div>
  );
}
