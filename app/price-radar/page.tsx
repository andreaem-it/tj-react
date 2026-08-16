import type { Metadata } from "next";
import PriceRadarContent from "@/components/PriceRadarContent";
import PriceRadarStructuredData from "@/components/PriceRadarStructuredData";
import { SITE_URL } from "@/lib/constants";
import { loadInitialPriceRadarData } from "@/lib/priceRadar/server";

/**
 * Offerte e prezzi cambiano di continuo, ma non a ogni richiesta: con ISR la
 * pagina resta statica e servibile dalla CDN invece di costare un render (più
 * chiamata a tj-api) per visita.
 *
 * Valore letterale obbligatorio: Next analizza staticamente i config di
 * segmento e rifiuta il build se `revalidate` è un identificatore importato.
 * Da tenere allineato a `PRICE_RADAR_REVALIDATE_SECONDS` in
 * `lib/priceRadar/server`, che governa la cache del fetch sottostante.
 */
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Price Radar – Offerte Tech Monitorate",
  description:
    "Monitoraggio automatico dei prezzi su Amazon per tecnologia, gaming e domotica.",
  alternates: {
    canonical: `${SITE_URL.replace(/\/$/, "")}/price-radar`,
  },
  openGraph: {
    title: "Price Radar – Offerte Tech Monitorate | TechJournal",
    description:
      "Monitoraggio automatico dei prezzi su Amazon per tecnologia, gaming e domotica.",
    url: `${SITE_URL.replace(/\/$/, "")}/price-radar`,
    siteName: "TechJournal",
  },
  twitter: {
    card: "summary_large_image",
    title: "Price Radar – Offerte Tech Monitorate | TechJournal",
    description:
      "Monitoraggio automatico dei prezzi su Amazon per tecnologia, gaming e domotica.",
  },
};

export default async function PriceRadarPage() {
  // Caricate qui e non nel componente client: prima, il primo render era uno
  // skeleton senza H1 né prodotti, ed era quello che vedevano i crawler.
  const initialData = await loadInitialPriceRadarData();

  return (
    <>
      <PriceRadarStructuredData />
      <PriceRadarContent initialData={initialData} />
    </>
  );
}
