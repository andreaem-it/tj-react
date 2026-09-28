import assert from "node:assert/strict";
import { test } from "node:test";
import { assessIphoneUpgrade, normalizeIphone } from "@/lib/iphoneUpgrade";
import type { Device } from "@/lib/compatibility/types";

function iphone(overrides: Partial<Device> & Pick<Device, "name" | "releaseYear">): Device {
  return {
    id: overrides.releaseYear ?? 1,
    slug: overrides.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    type: "iphone",
    endOfSupportYear: null,
    chipset: null,
    notes: null,
    imageUrl: null,
    imageR2Key: null,
    specs: null,
    ...overrides,
  };
}

const IPHONE_13 = iphone({
  name: "iPhone 13",
  releaseYear: 2021,
  chipset: "Apple A15 Bionic",
  specs: {
    ramGB: 4,
    display: '6.1" Super Retina XDR OLED',
    connector: "Lightning",
    storageOptionsGB: [128, 256, 512],
  },
});

const IPHONE_17 = iphone({
  name: "iPhone 17",
  releaseYear: 2025,
  chipset: "Apple A19",
  specs: {
    ramGB: 8,
    display: '6.3" Super Retina XDR OLED',
    connector: "USB-C",
    storageOptionsGB: [128, 256, 512],
    appleIntelligence: true,
  },
});

const IPHONE_18 = iphone({
  name: "iPhone 18",
  releaseYear: 2026,
  chipset: "Apple A20",
  notes: "Specifiche ipotetiche basate sull'evoluzione attesa.",
  specs: {
    ramGB: 10,
    display: '6.3" Super Retina XDR OLED',
    connector: "USB-C",
    storageOptionsGB: [128, 256, 512],
    appleIntelligence: true,
  },
});

test("normalizza le specifiche realmente usate dal catalogo", () => {
  const normalized = normalizeIphone(IPHONE_13);
  assert.equal(normalized.ramGB, 4);
  assert.equal(normalized.displayInches, 6.1);
  assert.equal(normalized.hasOled, true);
  assert.equal(normalized.hasPromotion, false);
  assert.equal(normalized.baseStorageGB, 128);
});

test("un salto da iPhone 13 a iPhone 18 è consigliato", () => {
  const result = assessIphoneUpgrade(IPHONE_13, IPHONE_18);
  assert.equal(result.verdict, "strong");
  assert.equal(result.isPreliminary, true);
  assert.ok(result.benefits.some((item) => item.id === "usb-c"));
  assert.ok(result.benefits.some((item) => item.id === "apple-intelligence"));
});

test("un solo anno con poche differenze invita ad aspettare", () => {
  const result = assessIphoneUpgrade(IPHONE_17, IPHONE_18);
  assert.equal(result.verdict, "wait");
  assert.equal(result.impact, "low");
});

test("non scambia il passaggio a un modello precedente per un upgrade", () => {
  const result = assessIphoneUpgrade(IPHONE_17, IPHONE_13);
  assert.equal(result.verdict, "downgrade");
  assert.match(result.summary, /precedente/);
});

test("segnala la perdita di ProMotion", () => {
  const pro = iphone({
    name: "iPhone 14 Pro",
    releaseYear: 2022,
    specs: { display: '6.1" OLED ProMotion', connector: "Lightning", ramGB: 6 },
  });
  const base = iphone({
    name: "iPhone 15",
    releaseYear: 2023,
    specs: { display: '6.1" OLED', connector: "USB-C", ramGB: 6 },
  });
  const result = assessIphoneUpgrade(pro, base);
  assert.ok(result.cautions.some((item) => item.id === "lose-promotion"));
  assert.equal(result.verdict, "wait");
});

test("la fine del supporto aumenta la convenienza del cambio", () => {
  const old = iphone({
    name: "iPhone X",
    releaseYear: 2017,
    endOfSupportYear: 2025,
    specs: { display: '5.8" OLED', connector: "Lightning", ramGB: 3 },
  });
  const result = assessIphoneUpgrade(old, IPHONE_17);
  assert.equal(result.verdict, "strong");
  assert.ok(result.benefits.some((item) => item.id === "support"));
});
