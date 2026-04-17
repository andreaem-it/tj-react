import { SITE_URL } from "@/lib/constants";

const BASE = SITE_URL.replace(/\/$/, "");

export default function PriceRadarStructuredData() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "TechJournal Price Radar",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "Servizio web per monitorare prezzi Amazon su prodotti tech, gaming e domotica.",
    url: `${BASE}/price-radar`,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
    },
    provider: {
      "@type": "Organization",
      name: "TechJournal",
      url: BASE,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
