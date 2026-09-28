import assert from "node:assert/strict";
import { test } from "node:test";
import type { Device } from "@/lib/compatibility/types";
import { findAmazonIphoneOffer } from "@/lib/iphonePriceRadar";
import type { PriceRadarProductListItem } from "@/lib/priceRadar/types";

const IPHONE_17: Device = {
  id: 17,
  name: "iPhone 17",
  slug: "iphone-17",
  type: "iphone",
  releaseYear: 2025,
  endOfSupportYear: null,
  chipset: "Apple A19",
  notes: null,
  imageUrl: null,
  imageR2Key: null,
  specs: null,
};

function product(
  title: string,
  overrides: Partial<PriceRadarProductListItem> = {},
): PriceRadarProductListItem {
  return {
    id: 1,
    asin: "B0EXAMPLE1",
    title,
    brand: "Apple",
    category: null,
    image_url: null,
    url: "https://www.amazon.it/dp/B0EXAMPLE1?tag=techjournal-it-21",
    current_price: 999,
    currency: "EUR",
    availability: "in_stock",
    min_price_30d: null,
    max_price_30d: null,
    discount_percent: 0,
    last_checked_at: null,
    last_price_change_at: null,
    priority_level: "warm",
    score: 0,
    ...overrides,
  };
}

test("trova il prezzo Amazon del modello esatto", () => {
  const offer = findAmazonIphoneOffer(IPHONE_17, [
    product("Apple iPhone 17 Pro 256 GB"),
    product("Apple iPhone 17 256 GB", { current_price: 949 }),
  ]);

  assert.equal(offer?.current_price, 949);
  assert.equal(offer?.title, "Apple iPhone 17 256 GB");
});

test("esclude accessori, varianti ed articoli non disponibili", () => {
  const offer = findAmazonIphoneOffer(IPHONE_17, [
    product("Cover trasparente per iPhone 17", { brand: "Spigen", current_price: 20 }),
    product("Apple iPhone 17 Pro 256 GB", { current_price: 900 }),
    product("Apple iPhone 17 256 GB", { availability: "out_of_stock", current_price: 949 }),
  ]);

  assert.equal(offer, null);
});

test("fra più tagli disponibili propone il prezzo più basso", () => {
  const offer = findAmazonIphoneOffer(IPHONE_17, [
    product("Apple iPhone 17 512 GB", { id: 2, current_price: 1199 }),
    product("Apple iPhone 17 256 GB", { id: 3, current_price: 999 }),
  ]);

  assert.equal(offer?.id, 3);
});
