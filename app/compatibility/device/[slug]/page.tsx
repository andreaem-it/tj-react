import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import TjLink from "@/components/TjLink";
import { StatusBadge } from "@/components/compatibility/StatusBadge";
import { ExperienceBadge } from "@/components/compatibility/ExperienceBadge";
import { DeviceDetailCard } from "@/components/compatibility/DeviceDetailCard";
import { SupportTypeBadge } from "@/components/compatibility/SupportTypeBadge";
import ProductPriceCard from "@/components/priceRadar/ProductPriceCard";
import {
  COMPATIBILITY_LIST_REVALIDATE_S,
  fetchCompatibilityDevices,
  fetchCompatibilityOsList,
  fetchDeviceDetail,
} from "@/lib/compatibility/serverApi";
import { loadDeviceContext } from "@/lib/compatibility/deviceContext";
import {
  analyzeDeviceSupport,
  describeDeviceSupport,
  describePredictions,
} from "@/lib/compatibility/insights";
import type { Device, DeviceDetailPayload } from "@/lib/compatibility/types";
import { SITE_URL } from "@/lib/constants";

/**
 * Scheda di compatibilità di un dispositivo.
 *
 * ISR: la pagina dipende solo da `params`, nessun `searchParams` né cookie. Con
 * `force-dynamic` ogni visita costava tre invocazioni (pagina + proxy + tj-api),
 * e le schede cambiano di rado.
 *
 * `generateStaticParams` non è opzionale per ottenere ISR: senza, una route con
 * segmento dinamico resta server-rendered a ogni richiesta e `revalidate` non ha
 * effetto (verificabile in `.next/prerender-manifest.json`).
 */
export const revalidate = 3600;
/** Slug non presenti al build (dispositivi nuovi): generati on-demand e cacheati. */
export const dynamicParams = true;

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  try {
    const devices = await fetchCompatibilityDevices();
    return devices
      .map((d) => (typeof d.slug === "string" ? d.slug.trim() : ""))
      .filter((slug) => slug.length > 0)
      .map((slug) => ({ slug }));
  } catch {
    // API irraggiungibile al build: nessun prerender, pagine generate on-demand.
    return [];
  }
}

const TYPE_LABEL = { iphone: "iPhone", ipad: "iPad", mac: "Mac" } as const;

type Props = { params: Promise<{ slug: string }> };

function isAbsoluteHttpUrl(u: string): boolean {
  try {
    const x = new URL(u);
    return x.protocol === "http:" || x.protocol === "https:";
  } catch {
    return false;
  }
}

function typeLabelOf(device: Device): string {
  return device.type in TYPE_LABEL
    ? TYPE_LABEL[device.type as keyof typeof TYPE_LABEL]
    : String(device.type);
}

/** Dati della pagina, condivisi da `generateMetadata` e dal render via Data Cache. */
async function loadPage(slug: string) {
  const detail = await fetchDeviceDetail(decodeURIComponent(slug));
  if (!detail?.device) return null;

  const osCatalog = await fetchCompatibilityOsList({
    revalidate: COMPATIBILITY_LIST_REVALIDATE_S,
  }).catch(() => []);

  const { device, latestSupportedOs, rows: rowsRaw } = detail as DeviceDetailPayload;
  const rows = rowsRaw ?? [];
  const insight = analyzeDeviceSupport({ device, latestSupportedOs, rows, osCatalog });

  return { device, rows, latestSupportedOs, insight };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadPage(slug);
  if (!data) return { title: "Dispositivo non trovato", robots: { index: false, follow: false } };

  const { device, insight } = data;
  const canonical = `${SITE_URL.replace(/\/$/, "")}/compatibility/device/${encodeURIComponent(slug)}`;

  /**
   * Titolo e descrizione costruiti dai dati reali.
   *
   * Prima erano "iPhone 12 · compatibilità" e "Compatibilità OS per iPhone 12
   * (iPhone)": due frasi che non contengono nessuna delle informazioni per cui
   * si arriva su questa pagina, e identiche nella forma su tutte e cinquantacinque
   * le schede.
   */
  // Un dispositivo le cui compatibilità sono tutte previste non può avere un
  // titolo al presente: annuncerebbe come fatto ciò che il corpo della pagina
  // dichiara come previsione.
  const onlyPredictions = insight.officialCount === 0 && insight.predictedCount > 0;
  const title = !insight.latestOs
    ? `${device.name}: compatibilità e scheda tecnica`
    : onlyPredictions
      ? `${device.name}: aggiornamenti previsti fino a ${insight.latestOs.name}`
      : `${device.name}: aggiornamenti fino a ${insight.latestOs.name}`;

  const description =
    describeDeviceSupport(device, insight) ??
    `${device.name} (${typeLabelOf(device)}): scheda tecnica e versioni di sistema operativo supportate.`;

  const image = device.imageUrl;
  return {
    title: { absolute: `${title} | TechJournal` },
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "TechJournal",
      type: "website",
      ...(image && isAbsoluteHttpUrl(image) ? { images: [{ url: image, alt: device.name }] } : {}),
    },
  };
}

/**
 * Collegamenti al resto del sito, in `Suspense`.
 *
 * Ricerca articoli e storico prezzi sono le due chiamate lente della pagina e
 * non devono trattenere la tabella di compatibilità, che è il motivo per cui si
 * arriva qui.
 */
async function DeviceContextSections({ device }: { device: Device }) {
  const { articles, product } = await loadDeviceContext(device);
  if (articles.length === 0 && !product) return null;

  return (
    <>
      {product && (
        <section className="mt-10" aria-labelledby="tj-device-prezzo">
          <h2 id="tj-device-prezzo" className="mb-3 text-lg font-semibold text-foreground">
            Prezzo monitorato
          </h2>
          <ProductPriceCard entry={product} />
        </section>
      )}

      {articles.length > 0 && (
        <section className="mt-10" aria-labelledby="tj-device-articoli">
          <h2 id="tj-device-articoli" className="mb-3 text-lg font-semibold text-foreground">
            Articoli su {device.name}
          </h2>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {articles.map(({ post, href }) => (
              <li key={post.id}>
                <TjLink
                  href={href}
                  className="block px-4 py-3 transition-colors hover:bg-surface-overlay"
                >
                  <span className="font-medium text-foreground">{post.title}</span>
                  <time className="mt-0.5 block text-xs text-muted" dateTime={post.date}>
                    {new Date(post.date).toLocaleDateString("it-IT", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      timeZone: "Europe/Rome",
                    })}
                  </time>
                </TjLink>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

export default async function DeviceCompatibilityPage({ params }: Props) {
  const { slug } = await params;
  const data = await loadPage(slug);
  if (!data) notFound();

  const { device, rows, latestSupportedOs, insight } = data;
  const answer = describeDeviceSupport(device, insight);
  const predictionsNote = describePredictions(insight.predictedCount, rows.length);

  /**
   * `Product` con `releaseDate` e `model`: sono dati presenti e visibili in
   * pagina. Nessun `offers` e nessun `aggregateRating` — il prezzo sta sulla
   * scheda Price Radar, e una valutazione qui sarebbe inventata.
   */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: device.name,
    category: typeLabelOf(device),
    ...(device.imageUrl && isAbsoluteHttpUrl(device.imageUrl) ? { image: device.imageUrl } : {}),
    ...(device.chipset ? { model: device.chipset } : {}),
    ...(device.releaseYear != null ? { releaseDate: String(device.releaseYear) } : {}),
    ...(answer ? { description: answer } : {}),
    brand: { "@type": "Brand", name: "Apple" },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SITE_URL.replace(/\/$/, "")}/compatibility/device/${encodeURIComponent(slug)}`,
    },
  };

  return (
    <div className="w-full min-w-0 max-w-4xl px-2 py-8 sm:px-0">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Compatibilità", href: "/compatibility" },
          { label: device.name },
        ]}
      />

      <DeviceDetailCard device={device} latestSupportedOs={latestSupportedOs} />

      {/* La risposta prima della tabella: chi arriva qui ha una domanda, non
          voglia di leggere sei righe e dedurla. */}
      {answer && (
        <p className="mb-8 rounded-lg border border-border bg-surface-overlay px-4 py-3 text-base text-foreground">
          {answer}
        </p>
      )}

      <section aria-labelledby="tj-device-tabella">
        <h2 id="tj-device-tabella" className="mb-3 text-lg font-semibold text-foreground">
          Versioni supportate
        </h2>
        {predictionsNote && (
          <p className="mb-3 text-sm text-muted">{predictionsNote}</p>
        )}
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-sidebar-bg text-muted">
              <tr>
                <th className="p-3 font-medium">Sistema operativo</th>
                <th className="p-3 font-medium">Esito</th>
                <th className="p-3 font-medium">Fonte</th>
                <th className="p-3 font-medium">Esperienza</th>
                <th className="p-3 font-medium">Note</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-muted">
                    Nessuna versione ancora collegata a questo dispositivo.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="p-3">
                      <TjLink
                        href={`/compatibility/os/${encodeURIComponent(row.os.slug)}`}
                        className="font-medium text-foreground hover:text-accent"
                      >
                        {row.os.name}
                      </TjLink>
                      {row.os.releaseYear != null && (
                        <span className="block text-xs text-muted">{row.os.releaseYear}</span>
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
                    <td className="max-w-xs p-3 text-muted">{row.notes || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Suspense fallback={null}>
        <DeviceContextSections device={device} />
      </Suspense>
    </div>
  );
}
