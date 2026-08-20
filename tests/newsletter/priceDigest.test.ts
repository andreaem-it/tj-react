import assert from "node:assert/strict";
import { test } from "node:test";
import { composePriceDigest, MIN_PRICE_DIGEST_ITEMS } from "@/lib/newsletter/priceDigest";
import type { RatedProduct } from "@/lib/priceRadar/productServer";
import type { PriceRadarProductListItem } from "@/lib/priceRadar/types";

const NOW = Date.UTC(2026, 7, 20, 12, 0, 0);
const START = new Date(NOW - 7 * 24 * 3_600_000);
const END = new Date(NOW);

let id = 1;
function deal(title: string, price: number, overrides: Partial<PriceRadarProductListItem> = {}): RatedProduct {
  const product: PriceRadarProductListItem = {
    id: id++,
    asin: `B0EXAMPLE${id}`,
    title,
    image_url: null,
    url: "https://www.amazon.it/dp/B0EXAMPLE",
    current_price: price,
    currency: "EUR",
    availability: "in_stock",
    min_price_30d: price,
    max_price_30d: price * 1.2,
    discount_percent: 20,
    last_checked_at: null,
    last_price_change_at: null,
    priority_level: "warm",
    score: 1,
    ...overrides,
  };
  return {
    product,
    stats: {
      windowDays: 30,
      min: price,
      max: price * 1.2,
      average: price * 1.1,
      observationCount: 20,
      observationDays: 15,
      spanDays: 30,
      coverage: 1,
    },
    rating: {
      level: "excellent",
      label: "Ottimo prezzo",
      confidence: "high",
      discountVsAverage: 9,
      distanceFromHistoricalLow: 0,
      premiumOverHistoricalLow: 0,
    },
  };
}

test("compone il digest quando ci sono abbastanza occasioni", () => {
  const digest = composePriceDigest(
    [deal("Prodotto uno", 99), deal("Prodotto due", 149), deal("Prodotto tre", 29)],
    { periodStart: START, periodEnd: END },
  );
  assert.ok(digest);
  assert.equal(digest!.kind, "price-radar-weekly");
  assert.equal(digest!.items.length, 3);
});

test("sotto la soglia minima non si compone alcun digest", () => {
  assert.equal(
    composePriceDigest([deal("Uno", 10), deal("Due", 20)], { periodStart: START, periodEnd: END }),
    null,
  );
  assert.equal(MIN_PRICE_DIGEST_ITEMS, 3);
});

test("una lista vuota non produce nulla", () => {
  assert.equal(composePriceDigest([], { periodStart: START, periodEnd: END }), null);
});

test("rispetta il tetto massimo di voci", () => {
  const deals = Array.from({ length: 10 }, (_, i) => deal(`Prodotto ${i}`, 10 + i));
  const digest = composePriceDigest(deals, { periodStart: START, periodEnd: END, maxItems: 5 });
  assert.equal(digest!.items.length, 5);
});
