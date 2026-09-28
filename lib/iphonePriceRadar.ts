import { mentionsDeviceExactly } from "@/lib/compatibility/deviceMatch";
import type { Device } from "@/lib/compatibility/types";
import type { PriceRadarProductListItem } from "@/lib/priceRadar/types";

/**
 * Trova un iPhone acquistabile nel catalogo Price Radar.
 *
 * Il controllo sul titolo iniziale esclude cover e caricabatterie che citano
 * il modello fra i dispositivi compatibili. `mentionsDeviceExactly` impedisce
 * invece che iPhone 17 rivendichi un'offerta per iPhone 17 Pro o Pro Max.
 */
export function findAmazonIphoneOffer(
  device: Device,
  products: readonly PriceRadarProductListItem[],
): PriceRadarProductListItem | null {
  const matches = products.filter((product) => {
    const title = product.title?.trim() ?? "";
    return (
      /^(?:apple\s+)?iphone\b/i.test(title) &&
      (!product.brand || /^apple$/i.test(product.brand.trim())) &&
      mentionsDeviceExactly(title, device.name) &&
      product.availability === "in_stock" &&
      product.current_price != null &&
      product.current_price > 0 &&
      Boolean(product.url)
    );
  });

  return matches.sort((a, b) => a.current_price! - b.current_price!)[0] ?? null;
}
