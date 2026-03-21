import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "@/lib/constants";

interface ProductPageProps {
  params: Promise<{ asin: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { asin } = await params;
  return {
    title: `Prezzo e storico | ${asin} | Price Radar`,
    description: `Monitoraggio prezzo e storico per il prodotto Amazon ${asin}.`,
    alternates: {
      canonical: `${SITE_URL.replace(/\/$/, "")}/price-radar/${asin}`,
    },
  };
}

/**
 * Pagina dettaglio prodotto Price Radar.
 * In futuro mostrerà il grafico storico prezzi da /techradar/api/price-history.php?asin=XXXX
 */
export default async function PriceRadarProductPage({ params }: ProductPageProps) {
  const { asin } = await params;

  if (!asin || asin.length < 5) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto px-0 md:px-4 py-10">
      <Link
        href="/price-radar"
        className="inline-flex items-center gap-2 text-accent hover:underline mb-8"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Torna a Price Radar
      </Link>

      <div className="bg-content-bg rounded-xl border border-border p-8 text-center">
        <h1 className="text-foreground text-2xl font-bold mb-2">Prodotto {asin}</h1>
        <p className="text-muted mb-6">
          Il grafico dello storico prezzi sarà disponibile a breve.
        </p>
        <p className="text-sm text-muted">
          API: <code className="bg-sidebar-bg px-2 py-1 rounded">/techradar/api/price-history.php?asin={asin}</code>
        </p>
      </div>
    </div>
  );
}
