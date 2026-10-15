import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assessIphoneUpgrade,
  buildIphoneComparisonSections,
  isUnconfirmedIphone,
  normalizeIphone,
} from "@/lib/iphoneUpgrade";
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

test("iPhone 18 Pro e Pro Max sono confermati anche se la nota pre-lancio è rimasta nel catalogo", () => {
  for (const slug of ["iphone-18-pro", "iphone-18-pro-max"]) {
    const released = iphone({
      name: slug === "iphone-18-pro" ? "iPhone 18 Pro" : "iPhone 18 Pro Max",
      slug,
      releaseYear: 2026,
      notes: "Versione Pro prevista con specifiche ipotetiche.",
    });
    assert.equal(isUnconfirmedIphone(released), false);
  }
});

test("gli altri modelli iPhone 18 non annunciati restano preliminari", () => {
  assert.equal(isUnconfirmedIphone(IPHONE_18), true);
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

test("un modello tecnologicamente inferiore non viene descritto come un cambio da rimandare", () => {
  const iphone14Pro = iphone({
    name: "iPhone 14 Pro",
    releaseYear: 2022,
    chipset: "Apple A16 Bionic",
    specs: { ramGB: 6, display: '6.1" Super Retina XDR OLED ProMotion', connector: "Lightning" },
  });
  const iphoneSe3 = iphone({
    name: "iPhone SE (3rd generation)",
    releaseYear: 2022,
    chipset: "Apple A15 Bionic",
    specs: { ramGB: 4, display: '4.7" Retina HD IPS LCD', connector: "Lightning" },
  });

  const result = assessIphoneUpgrade(iphone14Pro, iphoneSe3);

  assert.equal(result.verdict, "downgrade");
  assert.equal(result.title, "Il modello scelto è tecnologicamente inferiore");
  assert.ok(result.cautions.some((item) => item.id === "older-chip"));
  assert.ok(result.cautions.some((item) => item.id === "lose-oled"));
  assert.ok(result.cautions.some((item) => item.id === "lose-promotion"));
  assert.ok(result.cautions.some((item) => item.id === "less-ram"));
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

test("normalizza le specifiche estese usate dal confronto", () => {
  const normalized = normalizeIphone(iphone({
    name: "iPhone Prova",
    releaseYear: 2026,
    specs: {
      display: '6.3" OLED ProMotion',
      displayRefreshRateHz: 120,
      resolution: "2622×1206",
      cameraMainMP: 48,
      cameraTelephotoMP: 48,
      telephotoOpticalZoom: "8x",
      batteryVideoPlaybackHours: 43,
      wirelessCharging: "MagSafe, Qi2",
      frame: "Titanium",
      sim: "eSIM",
      processorCooling: "Vapor chamber",
      mainCameraVariableAperture: true,
    },
  }));

  assert.equal(normalized.refreshRateHz, 120);
  assert.equal(normalized.resolution, "2622×1206");
  assert.equal(normalized.cameraMainMP, 48);
  assert.equal(normalized.telephotoOpticalZoom, "8x");
  assert.equal(normalized.batteryVideoPlaybackHours, 43);
  assert.equal(normalized.frame, "Titanium");
  assert.equal(normalized.mainCameraVariableAperture, true);
});

test("costruisce un confronto tecnico completo e separa differenze da dati mancanti", () => {
  const from = iphone({
    name: "iPhone A",
    releaseYear: 2024,
    chipset: "Apple A18",
    specs: { ramGB: 8, display: '6.1" OLED', connector: "USB-C", storageOptionsGB: [128] },
  });
  const to = iphone({
    name: "iPhone B",
    releaseYear: 2026,
    chipset: "Apple A20 Pro",
    specs: {
      ramGB: 12,
      display: '6.3" OLED ProMotion',
      connector: "USB-C",
      storageOptionsGB: [256, 512],
      cameraMainMP: 48,
      batteryVideoPlaybackHours: 43,
    },
  });

  const sections = buildIphoneComparisonSections(from, to);
  const rows = sections.flatMap((section) => section.rows);
  const ram = rows.find((row) => row.id === "ram");
  const connector = rows.find((row) => row.id === "connector");
  const camera = rows.find((row) => row.id === "camera-main");

  assert.deepEqual(sections.map((section) => section.id), [
    "overview",
    "display",
    "performance",
    "camera",
    "battery",
    "connectivity",
    "storage-features",
  ]);
  assert.equal(ram?.differs, true);
  assert.equal(connector?.differs, false);
  assert.equal(camera?.incomplete, true);
  assert.equal(camera?.differs, false);
});

test("autonomia e apertura variabile producono motivazioni verificabili", () => {
  const from = iphone({
    name: "iPhone A",
    releaseYear: 2025,
    specs: { batteryVideoPlaybackHours: 25 },
  });
  const to = iphone({
    name: "iPhone B",
    releaseYear: 2026,
    specs: { batteryVideoPlaybackHours: 35, mainCameraVariableAperture: true },
  });

  const result = assessIphoneUpgrade(from, to);
  assert.ok(result.benefits.some((item) => item.id === "battery-video"));
  assert.ok(result.benefits.some((item) => item.id === "variable-aperture"));
});

test("il formato pieghevole espone sia opportunità sia compromesso", () => {
  const target = iphone({
    name: "iPhone Duo",
    releaseYear: 2026,
    specs: { foldable: true, formFactor: "Pieghevole" },
  });

  const result = assessIphoneUpgrade(IPHONE_17, target);
  assert.ok(result.benefits.some((item) => item.id === "foldable-display"));
  assert.ok(result.cautions.some((item) => item.id === "foldable-format"));
});
