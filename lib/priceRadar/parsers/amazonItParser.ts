export type ParsedAvailability = "in_stock" | "out_of_stock" | "unknown";

export interface AmazonItParseResult {
  price: number | null;
  currency: string;
  availability: ParsedAvailability;
  title: string | null;
  imageUrl: string | null;
  parserUsed: string;
  rawPriceText: string | null;
}

function normalizePriceText(raw: string): string {
  return raw.replace(/\s/g, " ").replace(/\u00a0/g, " ").trim();
}

/** Converte stringa prezzo EU (virgola decimale) in number. */
function parseEuPrice(s: string): number | null {
  const t = s.replace(/[^\d,.]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number.parseFloat(t);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseJsonLdPrices(html: string): { price: number; raw: string } | null {
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const chunk = m[1]?.trim();
    if (!chunk) continue;
    try {
      const data = JSON.parse(chunk) as unknown;
      const candidates = Array.isArray(data) ? data : [data];
      for (const item of candidates) {
        if (!item || typeof item !== "object") continue;
        const o = item as Record<string, unknown>;
        const types = o["@type"];
        const typeStr = Array.isArray(types) ? types.join(",") : String(types ?? "");
        if (!/Product/i.test(typeStr)) continue;
        const offers = o.offers;
        const offerList = Array.isArray(offers) ? offers : offers ? [offers] : [];
        for (const off of offerList) {
          if (!off || typeof off !== "object") continue;
          const price = (off as Record<string, unknown>).price;
          if (typeof price === "number" && price > 0) {
            return { price, raw: String(price) };
          }
          if (typeof price === "string") {
            const n = parseEuPrice(price);
            if (n != null) return { price: n, raw: price };
          }
        }
      }
    } catch {
      /* json non valido */
    }
  }
  return null;
}

function parseAriaPrice(html: string): { price: number; raw: string } | null {
  const re = /aria-label="[^"]*?([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))\s*€[^"]*"/i;
  const m = html.match(re);
  if (m?.[1]) {
    const n = parseEuPrice(m[1]);
    if (n != null) return { price: n, raw: m[1] };
  }
  return null;
}

function parseApriceBlocks(html: string): { price: number; raw: string } | null {
  const wholeM = html.match(/class="a-price-whole"[^>]*>([^<]+)</i);
  const fracM = html.match(/class="a-price-fraction"[^>]*>([^<]+)</i);
  if (wholeM?.[1]) {
    const whole = wholeM[1].replace(/\D/g, "");
    const frac = fracM?.[1]?.replace(/\D/g, "") ?? "";
    const raw = frac ? `${whole},${frac}` : whole;
    const n = parseEuPrice(raw);
    if (n != null) return { price: n, raw };
  }
  return null;
}

function detectAvailability(html: string): ParsedAvailability {
  const h = html.toLowerCase();
  if (
    /non disponibile|currently unavailable|non disponibile per il momento|we don\'t know when/i.test(
      h
    )
  ) {
    return "out_of_stock";
  }
  if (/aggiungi al carrello|add to cart|disponibilità immediata/i.test(h)) {
    return "in_stock";
  }
  return "unknown";
}

function parseOgTitle(html: string): string | null {
  const m = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
  return m?.[1] ? normalizePriceText(m[1]) : null;
}

function parseOgImage(html: string): string | null {
  const m = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
  return m?.[1]?.startsWith("http") ? m[1] : null;
}

/**
 * Parser dedicato pagina prodotto Amazon.it (HTML pubblico).
 * Fragile per natura: incapsulato qui, non logica sparsa.
 */
export function parseAmazonItProductHtml(html: string): AmazonItParseResult {
  const availability = detectAvailability(html);
  const title = parseOgTitle(html);
  const imageUrl = parseOgImage(html);

  let parserUsed = "none";
  let rawPriceText: string | null = null;
  let price: number | null = null;

  const ld = parseJsonLdPrices(html);
  if (ld) {
    price = ld.price;
    rawPriceText = ld.raw;
    parserUsed = "json_ld";
  } else {
    const aria = parseAriaPrice(html);
    if (aria) {
      price = aria.price;
      rawPriceText = aria.raw;
      parserUsed = "aria_label";
    } else {
      const ap = parseApriceBlocks(html);
      if (ap) {
        price = ap.price;
        rawPriceText = ap.raw;
        parserUsed = "a_price";
      }
    }
  }

  return {
    price,
    currency: "EUR",
    availability,
    title,
    imageUrl,
    parserUsed,
    rawPriceText,
  };
}
