import { SITE_URL } from "@/lib/constants";
import type { ProductRow } from "@/lib/priceRadar/types";

const BASE = SITE_URL.replace(/\/$/, "");

/**
 * Dati strutturati della pagina prodotto.
 *
 * Regola applicata senza eccezioni: **si dichiara solo ciò che è visibile in
 * pagina e verificato** (§17).
 *
 * In particolare non viene mai emesso `aggregateRating` né `review`. Il price
 * score è una valutazione algoritmica del prezzo rispetto al suo storico, non un
 * giudizio sul prodotto e non l'opinione di nessuno: mapparlo su un rating
 * Schema.org produrrebbe stelline nei risultati di ricerca basate su una
 * recensione che non esiste.
 */

/** Corrispondenza fra la disponibilità di tj-api e il vocabolario Schema.org. */
const AVAILABILITY_URL: Record<string, string> = {
  in_stock: "https://schema.org/InStock",
  out_of_stock: "https://schema.org/OutOfStock",
};

/**
 * Ripulisce il brand prima di dichiararlo.
 *
 * Il campo arriva dallo scraping e nel catalogo reale contiene testi di link
 * ("Visita lo Store Amazon Fire TV", "Visita l'Amazon Kindle") invece del
 * produttore. Dichiararli come `brand` significherebbe pubblicare un dato
 * sbagliato in un formato che i motori leggono come affermazione strutturata:
 * meglio nessun brand.
 */
export function cleanBrand(brand: string | null | undefined): string | null {
  const value = brand?.trim();
  if (!value) return null;
  if (/^visita\b/i.test(value)) return null;
  if (/\bstore\b/i.test(value)) return null;
  return value;
}

export default function ProductStructuredData({
  product,
  canonicalPath,
}: {
  product: ProductRow;
  canonicalPath: string;
}) {
  const title = product.title?.trim();
  const price = product.current_price;

  // Senza nome o senza prezzo non c'è un `Product` valido da dichiarare: si
  // omette il blocco invece di riempirlo di segnaposto.
  if (!title || price == null || !Number.isFinite(price) || price <= 0) return null;

  const brand = cleanBrand(product.brand);
  const availability = AVAILABILITY_URL[product.availability];
  const image = product.image_url?.trim();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: title,
    ...(image && { image }),
    ...(brand && { brand: { "@type": "Brand", name: brand } }),
    ...(product.asin && { sku: product.asin }),
    offers: {
      "@type": "Offer",
      price: price.toFixed(2),
      priceCurrency: product.currency || "EUR",
      url: product.url,
      ...(availability && { availability }),
      seller: { "@type": "Organization", name: "Amazon" },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${BASE}${canonicalPath}` },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
