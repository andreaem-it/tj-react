import Image from "next/image";
import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import TjLink from "@/components/TjLink";
import { fetchCompatibilityDevices } from "@/lib/compatibility/serverApi";
import type { Device } from "@/lib/compatibility/types";
import {
  assessIphoneUpgrade,
  buildIphoneComparisonSections,
  type IphoneUpgradeAssessment,
  type IphoneComparisonSection,
  type UpgradeReason,
  type UpgradeVerdict,
} from "@/lib/iphoneUpgrade";
import { withOfficialComparatorDevices } from "@/lib/iphoneUpgradeCatalog";
import { findAmazonIphoneOffer } from "@/lib/iphonePriceRadar";
import { loadProductList } from "@/lib/priceRadar/productServer";
import { formatEuro } from "@/lib/priceRadar/rating";
import type { PriceRadarProductListItem } from "@/lib/priceRadar/types";
import { SITE_URL } from "@/lib/constants";

export const dynamic = "force-dynamic";

const canonical = `${SITE_URL.replace(/\/$/, "")}/confronta-iphone`;

export const metadata: Metadata = {
  title: "Conviene cambiare iPhone? Confronta due modelli",
  description:
    "Scegli il tuo iPhone e quello che vuoi acquistare: scopri se l'aggiornamento conviene, quali miglioramenti noterai e a cosa rinunceresti.",
  alternates: { canonical },
  openGraph: {
    title: "Conviene cambiare iPhone?",
    description: "Un verdetto chiaro basato sulle differenze reali fra due modelli.",
    url: canonical,
    type: "website",
  },
};

interface PageProps {
  searchParams: Promise<{ da?: string; a?: string }>;
  redirectToCleanUrl?: boolean;
}

function buildComparisonPath(fromSlug: string, toSlug: string) {
  return `/confronta-iphone/${encodeURIComponent(fromSlug)}/${encodeURIComponent(toSlug)}/`;
}

const VERDICT_STYLE: Record<UpgradeVerdict, string> = {
  strong: "border-emerald-500/35 bg-emerald-500/10",
  good: "border-lime-500/35 bg-lime-500/10",
  specific: "border-amber-500/35 bg-amber-500/10",
  wait: "border-sky-500/35 bg-sky-500/10",
  downgrade: "border-rose-500/35 bg-rose-500/10",
};

const VERDICT_LABEL: Record<UpgradeVerdict, string> = {
  strong: "Aggiornamento molto consigliato",
  good: "Aggiornamento consigliato",
  specific: "Aggiornamento da valutare",
  wait: "Aggiornamento non necessario",
  downgrade: "Non è un aggiornamento",
};

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-5-5 5 5-5 5" />
    </svg>
  );
}

function CheckIcon({ caution = false }: { caution?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden className="mt-0.5 h-5 w-5 shrink-0">
      {caution ? (
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 4.9 2.8 18a1.4 1.4 0 0 0 1.2 2.1h16a1.4 1.4 0 0 0 1.2-2.1L13.7 4.9a2 2 0 0 0-3.4 0Z" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" d="m5 12 4 4L19 6" />
      )}
    </svg>
  );
}

function DeviceSelect({
  name,
  label,
  value,
  devices,
}: {
  name: string;
  label: string;
  value: string;
  devices: Device[];
}) {
  return (
    <label className="block min-w-0 flex-1">
      <span className="mb-2 block text-sm font-semibold text-foreground">{label}</span>
      <select
        name={name}
        required
        defaultValue={value}
        className="min-h-12 w-full rounded-xl border border-border bg-content-bg px-4 py-3 text-base text-foreground shadow-sm transition hover:border-accent focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
      >
        <option value="">Scegli un modello…</option>
        {devices.map((device) => (
          <option key={device.id} value={device.slug}>
            {device.name}{device.releaseYear ? ` · ${device.releaseYear}` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}

function DeviceHeading({ device }: { device: Device }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-2 text-center sm:flex-row sm:gap-3 sm:text-left">
      {device.imageUrl ? (
        <Image
          src={device.imageUrl}
          alt=""
          width={72}
          height={72}
          sizes="72px"
          className="h-14 w-14 shrink-0 object-contain sm:h-[72px] sm:w-[72px]"
        />
      ) : (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-surface-overlay text-xs text-muted sm:h-[72px] sm:w-[72px]">
          iPhone
        </div>
      )}
      <div className="min-w-0">
        <h3 className="text-sm font-semibold leading-5 text-foreground sm:text-lg">{device.name}</h3>
        <p className="mt-0.5 text-sm text-muted">
          {[device.releaseYear, device.chipset].filter(Boolean).join(" · ")}
        </p>
      </div>
    </div>
  );
}

function ReasonList({ title, reasons, caution = false }: { title: string; reasons: UpgradeReason[]; caution?: boolean }) {
  if (reasons.length === 0) return null;
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-foreground">{title}</h2>
      <ul className="divide-y divide-border rounded-xl border border-border bg-content-bg px-4 sm:px-5">
        {reasons.map((reason) => (
          <li key={reason.id} className="flex gap-3 py-4">
            <span className={caution ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}>
              <CheckIcon caution={caution} />
            </span>
            <div>
              <h3 className="font-semibold text-foreground">{reason.title}</h3>
              <p className="mt-1 text-sm leading-6 text-muted">{reason.description}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function DesktopComparisonSection({
  section,
  from,
  to,
}: {
  section: IphoneComparisonSection;
  from: Device;
  to: Device;
}) {
  return (
    <div className="hidden overflow-hidden rounded-xl border border-border bg-content-bg sm:block">
      <table className="w-full table-fixed text-left text-sm">
        <caption className="bg-surface-overlay px-4 py-3 text-left text-base font-semibold text-foreground">
          {section.title}
        </caption>
        <thead className="border-t border-border text-xs font-semibold text-muted">
          <tr>
            <th scope="col" className="w-[28%] px-4 py-2.5">Caratteristica</th>
            <th scope="col" className="w-[36%] px-4 py-2.5">{from.name}</th>
            <th scope="col" className="w-[36%] px-4 py-2.5">{to.name}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {section.rows.map((row) => (
            <tr key={row.id} className={row.differs ? "bg-accent/5" : undefined}>
              <th scope="row" className="px-4 py-3 align-top font-medium text-muted">{row.label}</th>
              <td className="px-4 py-3 align-top text-foreground">{row.fromValue ?? "—"}</td>
              <td className="px-4 py-3 align-top font-medium text-foreground">{row.toValue ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MobileComparisonSection({
  section,
  from,
  to,
}: {
  section: IphoneComparisonSection;
  from: Device;
  to: Device;
}) {
  return (
    <section className="sm:hidden" aria-labelledby={`iphone-compare-${section.id}`}>
      <h3 id={`iphone-compare-${section.id}`} className="border-b border-border pb-2 text-lg font-semibold text-foreground">
        {section.title}
      </h3>
      <div className="divide-y divide-border">
        {section.rows.map((row) => (
          <div key={row.id} className={`py-4 ${row.differs ? "bg-accent/5 px-2" : ""}`}>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.06em] text-muted">{row.label}</p>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div className="min-w-0">
                <dt className="mb-1 truncate text-xs text-muted">{from.name}</dt>
                <dd className="break-words text-foreground">{row.fromValue ?? "—"}</dd>
              </div>
              <div className="min-w-0 border-l border-border pl-4">
                <dt className="mb-1 truncate text-xs text-muted">{to.name}</dt>
                <dd className="break-words font-medium text-foreground">{row.toValue ?? "—"}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}

function TechnicalComparison({ from, to }: { from: Device; to: Device }) {
  const sections = buildIphoneComparisonSections(from, to);
  const rows = sections.flatMap((section) => section.rows);
  const differences = rows.filter((row) => row.differs).length;
  const incomplete = rows.filter((row) => row.incomplete).length;

  return (
    <section aria-labelledby="iphone-technical-comparison">
      <h2 id="iphone-technical-comparison" className="text-xl font-semibold text-foreground">
        Specifiche a confronto
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
        {differences} {differences === 1 ? "differenza verificabile" : "differenze verificabili"}
        {incomplete > 0 ? ` · ${incomplete} ${incomplete === 1 ? "dato disponibile su un solo modello" : "dati disponibili su un solo modello"}` : ""}.
        Un valore mancante non viene considerato uno svantaggio.
      </p>
      <div className="mt-5 space-y-6">
        {sections.map((section) => (
          <div key={section.id}>
            <DesktopComparisonSection section={section} from={from} to={to} />
            <MobileComparisonSection section={section} from={from} to={to} />
          </div>
        ))}
      </div>
    </section>
  );
}

function AmazonPriceOffer({ product }: { product: PriceRadarProductListItem }) {
  return (
    <aside className="rounded-xl border border-accent/35 bg-accent/10 p-5 sm:flex sm:items-center sm:justify-between sm:gap-6">
      <div>
        <p className="text-sm font-semibold text-foreground">Disponibile su Amazon</p>
        <p className="mt-1 text-2xl font-bold text-foreground">
          {formatEuro(product.current_price!, product.currency || "EUR")}
        </p>
        <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted">{product.title}</p>
      </div>
      <div className="mt-4 flex shrink-0 flex-wrap gap-3 sm:mt-0">
        <TjLink
          href={`/price-radar/${product.asin}`}
          className="inline-flex min-h-11 items-center rounded-lg border border-border bg-content-bg px-4 py-2 text-sm font-semibold text-foreground hover:border-accent"
        >
          Vedi storico
        </TjLink>
        <a
          href={product.url}
          target="_blank"
          rel="nofollow sponsored noopener noreferrer"
          className="inline-flex min-h-11 items-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-gray-950 hover:brightness-95"
        >
          Vedi su Amazon ↗
        </a>
      </div>
    </aside>
  );
}

function Result({
  from,
  to,
  assessment,
  amazonOffer,
}: {
  from: Device;
  to: Device;
  assessment: IphoneUpgradeAssessment;
  amazonOffer: PriceRadarProductListItem | null;
}) {
  return (
    <div className="mt-10 space-y-8" aria-live="polite">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-xl border border-border bg-content-bg p-4 sm:gap-6 sm:p-6">
        <DeviceHeading device={from} />
        <span className="text-muted"><ArrowIcon /></span>
        <DeviceHeading device={to} />
      </div>

      {assessment.isPreliminary && (
        <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm leading-6 text-foreground">
          <strong>Valutazione preliminare.</strong> Alcuni dati di {to.name} non sono ancora confermati e il verdetto potrà cambiare.
        </div>
      )}

      <section className={`rounded-2xl border p-5 sm:p-7 ${VERDICT_STYLE[assessment.verdict]}`}>
        <p className="text-sm font-semibold text-foreground">{VERDICT_LABEL[assessment.verdict]}</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{assessment.title}</h2>
        <p className="mt-3 max-w-2xl text-base leading-7 text-foreground/85">{assessment.summary}</p>
      </section>

      {amazonOffer && <AmazonPriceOffer product={amazonOffer} />}

      <ReasonList title={`Cosa guadagni passando a ${to.name}`} reasons={assessment.benefits} />
      <ReasonList title="Limiti e compromessi da considerare" reasons={assessment.cautions} caution />
      <TechnicalComparison from={from} to={to} />

      <p className="border-t border-border pt-5 text-xs leading-5 text-muted">
        Il verdetto è prodotto da regole editoriali applicate alle specifiche presenti nel catalogo TechJournal. Il prezzo mostrato non modifica il giudizio tecnico; stato della batteria e valore di permuta del dispositivo attuale non sono inclusi.
      </p>
    </div>
  );
}

export default async function IphoneUpgradePage({ searchParams, redirectToCleanUrl = true }: PageProps) {
  const params = await searchParams;
  const fromSlug = (params.da ?? "").trim();
  const toSlug = (params.a ?? "").trim();

  if (redirectToCleanUrl && fromSlug && toSlug) {
    permanentRedirect(buildComparisonPath(fromSlug, toSlug));
  }

  const [catalogDevices, priceRadarProducts] = await Promise.all([
    fetchCompatibilityDevices("iphone").catch(() => []),
    toSlug ? loadProductList().catch(() => []) : Promise.resolve([]),
  ]);
  const devices = withOfficialComparatorDevices(catalogDevices);
  const orderedDevices = [...devices].sort((a, b) => (b.releaseYear ?? 0) - (a.releaseYear ?? 0) || b.id - a.id);
  const from = orderedDevices.find((device) => device.slug === fromSlug) ?? null;
  const to = orderedDevices.find((device) => device.slug === toSlug) ?? null;
  const sameDevice = Boolean(from && to && from.id === to.id);
  const assessment = from && to && !sameDevice ? assessIphoneUpgrade(from, to) : null;
  const amazonOffer = to ? findAmazonIphoneOffer(to, priceRadarProducts) : null;

  return (
    <main className="w-full min-w-0 max-w-5xl px-2 py-8 sm:px-0 sm:py-10">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Confronta iPhone" }]} />

      <div className="max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Conviene cambiare iPhone?</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
          Indica il modello che usi e quello che stai valutando. Ti diremo quanto è significativo il salto e quali differenze noterai davvero.
        </p>
      </div>

      <form method="get" action="/confronta-iphone" className="mt-8 rounded-2xl border border-border bg-content-bg p-4 shadow-card sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <DeviceSelect name="da" label="Il tuo iPhone" value={fromSlug} devices={orderedDevices} />
          <span className="hidden pb-3 text-muted sm:block"><ArrowIcon /></span>
          <DeviceSelect name="a" label="L’iPhone che vuoi acquistare" value={toSlug} devices={orderedDevices} />
          <button
            type="submit"
            disabled={devices.length === 0}
            className="min-h-12 shrink-0 rounded-xl bg-accent px-6 py-3 font-semibold text-gray-950 transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            Valuta il cambio
          </button>
        </div>
        {devices.length === 0 && (
          <p className="mt-4 text-sm text-muted">Il catalogo degli iPhone non è disponibile in questo momento. Riprova fra poco.</p>
        )}
      </form>

      {sameDevice && (
        <p className="mt-6 rounded-xl border border-border bg-surface-overlay px-4 py-3 text-sm text-foreground">
          Hai scelto lo stesso iPhone in entrambi i campi. Seleziona due modelli diversi per valutare il cambio.
        </p>
      )}
      {(fromSlug || toSlug) && devices.length > 0 && (!from || !to) && !sameDevice && (
        <p className="mt-6 rounded-xl border border-border bg-surface-overlay px-4 py-3 text-sm text-foreground">
          Seleziona entrambi i modelli per ottenere il verdetto.
        </p>
      )}
      {from && to && assessment && (
        <Result from={from} to={to} assessment={assessment} amazonOffer={amazonOffer} />
      )}

      {!fromSlug && !toSlug && devices.length > 0 && (
        <section className="mt-10 border-t border-border pt-8">
          <h2 className="text-xl font-semibold text-foreground">Non solo una tabella di specifiche</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Il confronto considera il salto generazionale, il supporto, display, memoria, connettore e funzioni disponibili. Evidenzia anche eventuali rinunce, come il passaggio da un modello Pro a uno standard.
          </p>
        </section>
      )}
    </main>
  );
}
