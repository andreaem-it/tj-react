import type { Metadata } from "next";
import PriceRadarContent from "@/components/PriceRadarContent";
import { SITE_URL } from "@/lib/constants";

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

export default function PriceRadarPage() {
  return <PriceRadarContent />;
}
