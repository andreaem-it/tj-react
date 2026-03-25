export type ParsedAvailability = "in_stock" | "out_of_stock" | "unknown";

export interface AmazonItParseResult {
  price: number | null;
  currency: string;
  availability: ParsedAvailability;
  title: string | null;
  imageUrl: string | null;
  parserUsed: string;
  rawPriceText: string | null;
  /** Affidabilità stimata del prezzo estratto (0–1). */
  confidence: number;
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

type LayerHit = { price: number; raw: string; layer: string; confidence: number };

function parseJsonLdPrices(html: string): LayerHit | null {
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
            return { price, raw: String(price), layer: "json_ld", confidence: 0.92 };
          }
          if (typeof price === "string") {
            const n = parseEuPrice(price);
            if (n != null) return { price: n, raw: price, layer: "json_ld", confidence: 0.9 };
          }
        }
      }
    } catch {
      /* json non valido */
    }
  }
  return null;
}

function parseAriaPrice(html: string): LayerHit | null {
  const patterns = [
    /aria-label="[^"]*?([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))\s*€[^"]*"/i,
    /aria-label="[^"]*?€\s*([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))[^"]*"/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) {
      const n = parseEuPrice(m[1]);
      if (n != null) return { price: n, raw: m[1], layer: "aria_label", confidence: 0.84 };
    }
  }
  return null;
}

function parseApriceBlocks(html: string): LayerHit | null {
  const wholeM = html.match(/class="a-price-whole"[^>]*>([^<]+)</i);
  const fracM = html.match(/class="a-price-fraction"[^>]*>([^<]+)</i);
  if (wholeM?.[1]) {
    const whole = wholeM[1].replace(/\D/g, "");
    const frac = fracM?.[1]?.replace(/\D/g, "") ?? "";
    const raw = frac ? `${whole},${frac}` : whole;
    const n = parseEuPrice(raw);
    if (n != null) return { price: n, raw, layer: "a_price_whole_fraction", confidence: 0.76 };
  }
  return null;
}

/** Selettori aggiuntivi comuni nelle pagine prodotto Amazon. */
function parseDomSelectors(html: string): LayerHit | null {
  const dataPrice = html.match(/data-a-color-price[^>]*>([^<]+)</i);
  if (dataPrice?.[1]) {
    const n = parseEuPrice(dataPrice[1]);
    if (n != null) return { price: n, raw: dataPrice[1].trim(), layer: "data_a_color_price", confidence: 0.72 };
  }
  const offscreen = html.match(/class="a-offscreen"[^>]*>([^<]*€[^<]+)</i);
  if (offscreen?.[1]) {
    const n = parseEuPrice(offscreen[1]);
    if (n != null) return { price: n, raw: offscreen[1].trim(), layer: "a_offscreen", confidence: 0.7 };
  }
  const twister = html.match(/class="a-price\s+a-text-price"[^>]*>[\s\S]*?class="a-offscreen"[^>]*>([^<]+)/i);
  if (twister?.[1]) {
    const n = parseEuPrice(twister[1]);
    if (n != null) return { price: n, raw: twister[1].trim(), layer: "a_text_price", confidence: 0.68 };
  }
  return null;
}

function parseRegexFallback(html: string): LayerHit | null {
  const patterns = [
    /€\s*([\d]{1,3}(?:\.\d{3})*,\d{2})/g,
    /EUR\s*([\d]{1,3}(?:\.\d{3})*,\d{2})/gi,
    /([\d]{1,3}(?:[.,]\d{3})*[.,]\d{2})\s*€/g,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    const r = new RegExp(re.source, re.flags);
    while ((m = r.exec(html)) !== null) {
      if (m[1]) {
        const n = parseEuPrice(m[1]);
        if (n != null && n > 0 && n < 50000) {
          return { price: n, raw: m[1], layer: "regex_eur", confidence: 0.48 };
        }
      }
    }
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

function mergeConfidence(hits: LayerHit[]): { hit: LayerHit; confidence: number } | null {
  if (hits.length === 0) return null;
  hits.sort((a, b) => b.confidence - a.confidence);
  const best = hits[0];
  let conf = best.confidence;
  for (let i = 1; i < hits.length; i++) {
    const other = hits[i];
    if (Math.abs(other.price - best.price) / best.price < 0.01) {
      conf = Math.min(0.99, conf + 0.04);
    }
  }
  return { hit: best, confidence: conf };
}

/**
 * Parser multi-strato pagina prodotto Amazon.it (HTML pubblico).
 * Ordine: JSON-LD → aria → blocchi a-price → selettori DOM → regex.
 */
export function parseAmazonItProductHtml(html: string): AmazonItParseResult {
  const availability = detectAvailability(html);
  const title = parseOgTitle(html);
  const imageUrl = parseOgImage(html);

  const hits: LayerHit[] = [];
  const ld = parseJsonLdPrices(html);
  if (ld) hits.push(ld);
  const aria = parseAriaPrice(html);
  if (aria) hits.push(aria);
  const ap = parseApriceBlocks(html);
  if (ap) hits.push(ap);
  const dom = parseDomSelectors(html);
  if (dom) hits.push(dom);
  const rx = parseRegexFallback(html);
  if (rx) hits.push(rx);

  const merged = mergeConfidence(hits);

  if (!merged) {
    return {
      price: null,
      currency: "EUR",
      availability,
      title,
      imageUrl,
      parserUsed: "none",
      rawPriceText: null,
      confidence: 0,
    };
  }

  return {
    price: merged.hit.price,
    currency: "EUR",
    availability,
    title,
    imageUrl,
    parserUsed: merged.hit.layer,
    rawPriceText: merged.hit.raw,
    confidence: merged.confidence,
  };
}
