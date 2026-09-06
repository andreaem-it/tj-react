import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import TjLink from "@/components/TjLink";
import PriceHistoryChart from "@/components/priceRadar/PriceHistoryChart";
import PriceStatus from "@/components/priceRadar/PriceStatus";
import ProductStructuredData, { cleanBrand } from "@/components/priceRadar/ProductStructuredData";
import WatchPriceButton from "@/components/personal/WatchPriceButton";
import { BLUR_DATA_URL, SITE_URL } from "@/lib/constants";
import { HISTORY_RANGE_LABEL } from "@/lib/priceRadar/history";
import {
  analyzeProduct,
  loadPriceHistory,
  loadProductById,
  loadProductList,
  resolveProductIdByAsin,
} from "@/lib/priceRadar/productServer";
import { formatEuro } from "@/lib/priceRadar/rating";

/**
 * Pagina prodotto Price Radar.
 *
 * Sostituisce un segnaposto che diceva "il grafico dello storico prezzi sarà
 * disponibile a breve" ed esponeva l'URL dell'API interna. Quel segnaposto era
 * generato per **ogni** prodotto monitorato ed era in sitemap: novantaquattro
 * URL indicizzabili con lo stesso identico contenuto e nessuna informazione.
 *
 * L'ordine dei blocchi risponde alle domande nell'ordine in cui il lettore se le
 * pone (§19): quanto costa, è un buon prezzo, quanto costava di solito, qual è
 * stato il minimo, come si è mosso, quando l'abbiamo controllato, dove si compra.
 */
export const revalidate = 1800;
export const dynamicParams = true;

/**
 * Solo il rendering è prerenderizzato, non l'elenco: `generateStaticParams`
 * legge il catalogo una volta e la stessa risposta serve tutte le pagine grazie
 * alla Data Cache.
 */
export async function generateStaticParams(): Promise<Array<{ asin: string }>> {
  // Il catalogo arriva da tj-api: durante il build Vercel le schede possono
  // essere generate on-demand e cacheate con ISR. Evitiamo quindi che un
  // timeout dell'upstream venga ripetuto per ogni ASIN e ritardi il deploy.
  if (process.env.VERCEL === "1") return [];

  try {
    const products = await loadProductList();
    return products
      .filter((p) => typeof p.asin === "string" && p.asin.length >= 5)
      .map((p) => ({ asin: p.asin }));
  } catch {
    return [];
  }
}

interface ProductPageProps {
  params: Promise<{ asin: string }>;
}

/** Formato ASIN Amazon: dieci caratteri alfanumerici maiuscoli. */
const ASIN_RE = /^[A-Z0-9]{10}$/;

async function loadPage(asin: string) {
  const normalized = asin.trim().toUpperCase();
  if (!ASIN_RE.test(normalized)) return null;

  const id = await resolveProductIdByAsin(normalized);
  if (id == null) return null;

  const [product, history] = await Promise.all([loadProductById(id), loadPriceHistory(id)]);
  if (!product) return null;

  // `Date.now()` qui e non dentro i moduli puri: l'istante entra nell'analisi
  // come parametro, così le funzioni restano riproducibili e testabili.
  return { product, ...analyzeProduct(product.current_price, history, Date.now()) };
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { asin } = await params;
  const data = await loadPage(asin);
  if (!data) {
    return { title: "Prodotto non trovato", robots: { index: false, follow: false } };
  }

  const { product, rating, stats } = data;
  const title = product.title?.trim() || `Prodotto ${product.asin}`;
  const canonical = `${SITE_URL.replace(/\/$/, "")}/price-radar/${product.asin}`;

  const description =
    product.current_price != null && rating.confidence !== "insufficient" && stats.average != null
      ? `${title}: oggi ${formatEuro(product.current_price, product.currency)}, media registrata ${formatEuro(stats.average, product.currency)}. Storico prezzi e valutazione su TechJournal.`
      : `${title}: prezzo attuale, storico delle rilevazioni e disponibilità monitorati da TechJournal Price Radar.`;

  return {
    title: { absolute: `${title.slice(0, 70)} — prezzo e storico | TechJournal` },
    description,
    alternates: { canonical },
    /**
     * Fuori dall'indice finché lo storico non permette di rispondere alla
     * domanda che la pagina promette.
     *
     * Con due o tre rilevazioni su un paio di giorni la pagina può mostrare il
     * prezzo di oggi ma non dire se sia conveniente — cioè non aggiunge nulla
     * alla scheda del negozio. Su un catalogo di quasi cento prodotti sarebbero
     * altrettante pagine sottili quasi identiche.
     *
     * Stessa sorte per i prodotti senza titolo: l'ingestion a volte non lo
     * recupera, e una pagina intitolata "Prodotto B0XXXXXXXX" non risponde ad
     * alcuna ricerca.
     *
     * `follow` resta attivo, e la pagina rientra da sola quando il tracker ha
     * accumulato abbastanza rilevazioni: nessun intervento manuale.
     */
    ...(rating.confidence === "insufficient" || !product.title?.trim()
      ? { robots: { index: false, follow: true } }
      : {}),
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "TechJournal",
      type: "website",
      ...(product.image_url ? { images: [{ url: product.image_url, alt: title }] } : {}),
    },
  };
}

function formatCheckedAt(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Rome",
  });
}

const AVAILABILITY_LABEL: Record<string, string> = {
  in_stock: "Disponibile",
  out_of_stock: "Non disponibile",
  unknown: "Disponibilità non nota",
};

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-overlay px-4 py-3">
      <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 font-semibold text-foreground">{value}</dd>
      {hint && <dd className="mt-0.5 text-xs text-muted">{hint}</dd>}
    </div>
  );
}

export default async function PriceRadarProductPage({ params }: ProductPageProps) {
  const { asin } = await params;
  const data = await loadPage(asin);
  if (!data) notFound();

  const { product, rating, stats, series, availableRanges, ratingWindow, analysis } = data;
  const title = product.title?.trim() || `Prodotto ${product.asin}`;
  const brand = cleanBrand(product.brand);
  const checkedAt = formatCheckedAt(product.last_checked_at);
  const currency = product.currency || "EUR";
  const periodo = HISTORY_RANGE_LABEL[ratingWindow].toLowerCase();

  return (
    <div className="mx-auto w-full min-w-0 max-w-5xl px-[5px] py-6 md:px-4">
      <ProductStructuredData product={product} canonicalPath={`/price-radar/${product.asin}`} />

      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Price Radar", href: "/price-radar" },
          { label: title },
        ]}
      />

      <div className="flex flex-col gap-6 md:flex-row md:gap-8">
        {product.image_url && (
          <div className="relative mx-auto h-48 w-48 shrink-0 overflow-hidden rounded-lg border border-border bg-white md:h-56 md:w-56">
            <Image
              src={product.image_url}
              alt={title}
              fill
              className="object-contain p-3"
              sizes="224px"
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
              priority
            />
          </div>
        )}

        <div className="min-w-0 flex-1">
          {brand && (
            <p className="text-sm font-semibold uppercase tracking-wide text-muted">{brand}</p>
          )}
          <h1 className="mt-1 text-xl font-bold text-foreground md:text-3xl">{title}</h1>

          <PriceStatus
            className="mt-5"
            currentPrice={product.current_price}
            currency={currency}
            rating={rating}
            stats={stats}
            variant="full"
          />

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a
              href={product.url}
              target="_blank"
              rel="nofollow sponsored noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-3 font-semibold text-gray-900 transition-opacity hover:opacity-90"
            >
              Vedi l&apos;offerta su Amazon
              <span aria-hidden>↗</span>
            </a>
            <span className="text-sm text-muted">
              {AVAILABILITY_LABEL[product.availability] ?? AVAILABILITY_LABEL.unknown}
            </span>
          </div>
          {/* La trasparenza sull'affiliazione sta accanto al pulsante, non nel
              footer: qui il rating è già stato letto, e chi legge deve poter
              sapere che il link è affiliato mentre decide se cliccarlo. */}
          <p className="mt-2 text-xs text-muted">
            Link affiliato: se acquisti, TechJournal riceve una commissione senza costi aggiuntivi
            per te. La valutazione del prezzo è calcolata dallo storico ed è indipendente
            dall&apos;affiliazione.
          </p>

          <WatchPriceButton
            className="mt-5"
            asin={product.asin}
            title={title}
            currentPrice={product.current_price}
            currency={currency}
          />
        </div>
      </div>

      <section className="mt-10" aria-labelledby="tj-pr-metriche">
        <h2 id="tj-pr-metriche" className="mb-4 text-lg font-bold text-foreground md:text-xl">
          Il prezzo in numeri
        </h2>
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Metric
            label="Prezzo attuale"
            value={
              product.current_price != null
                ? formatEuro(product.current_price, currency)
                : "Non disponibile"
            }
          />
          <Metric
            label={`Media ${periodo}`}
            value={stats.average != null ? formatEuro(stats.average, currency) : "—"}
            hint={stats.average != null ? "ponderata sul tempo" : undefined}
          />
          <Metric
            label="Minimo registrato"
            value={stats.min != null ? formatEuro(stats.min, currency) : "—"}
          />
          <Metric
            label="Massimo registrato"
            value={stats.max != null ? formatEuro(stats.max, currency) : "—"}
          />
        </dl>

        <p className="mt-3 text-xs text-muted">
          {stats.observationCount > 0 ? (
            <>
              Calcolato su {stats.observationCount}{" "}
              {stats.observationCount === 1 ? "rilevazione" : "rilevazioni"} in{" "}
              {stats.observationDays}{" "}
              {stats.observationDays === 1 ? "giorno" : "giorni"} distinti.
              {analysis.discardedCount > 0 && (
                <>
                  {" "}
                  {analysis.discardedCount}{" "}
                  {analysis.discardedCount === 1 ? "rilevazione scartata" : "rilevazioni scartate"}{" "}
                  perché incompatibili con la serie.
                </>
              )}
            </>
          ) : (
            "Nessuna rilevazione disponibile per questo periodo."
          )}
          {checkedAt && <> Ultimo controllo: {checkedAt}.</>}
        </p>
      </section>

      <section className="mt-10" aria-labelledby="tj-pr-storico">
        <h2 id="tj-pr-storico" className="mb-4 text-lg font-bold text-foreground md:text-xl">
          Andamento del prezzo
        </h2>
        {availableRanges.length > 0 ? (
          <PriceHistoryChart
            series={series}
            windows={analysis.windows}
            availableRanges={availableRanges}
            initialRange={availableRanges.includes(ratingWindow) ? ratingWindow : availableRanges[0]}
            currency={currency}
            productTitle={title}
          />
        ) : (
          <p className="rounded-lg border border-border bg-surface-overlay px-4 py-6 text-sm text-muted">
            Il monitoraggio di questo prodotto è appena iniziato: servono almeno due rilevazioni per
            mostrare un andamento.
          </p>
        )}
      </section>

      <p className="mt-10 text-sm">
        <TjLink href="/price-radar" className="text-accent hover:underline">
          ← Tutti i prodotti monitorati
        </TjLink>
      </p>
    </div>
  );
}
