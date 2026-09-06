import assert from "node:assert/strict";
import { test } from "node:test";
import {
  analyzeDeviceSupport,
  analyzeOsSupport,
  describeDeviceSupport,
  describeOsSupport,
  describePredictions,
  newestReleasedOs,
} from "@/lib/compatibility/insights";
import type {
  CompatibilityWithDevice,
  CompatibilityWithOs,
  Device,
  OperatingSystem,
} from "@/lib/compatibility/types";

function os(overrides: Partial<OperatingSystem> & { id: number; name: string }): OperatingSystem {
  return {
    slug: overrides.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    type: "ios",
    releaseYear: 2024,
    isFuture: false,
    ...overrides,
  };
}

function device(overrides: Partial<Device> & { id: number; name: string }): Device {
  return {
    slug: overrides.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    type: "iphone",
    releaseYear: 2020,
    endOfSupportYear: null,
    chipset: null,
    notes: null,
    imageUrl: null,
    imageR2Key: null,
    specs: null,
    ...overrides,
  };
}

function osRow(o: OperatingSystem, supportType: CompatibilityWithOs["supportType"] = "official"): CompatibilityWithOs {
  return {
    id: o.id,
    deviceId: 1,
    osId: o.id,
    status: "supported",
    supportType,
    experience: "good",
    notes: null,
    os: o,
  };
}

function deviceRow(
  d: Device,
  supportType: CompatibilityWithDevice["supportType"] = "official",
  status: CompatibilityWithDevice["status"] = "supported",
): CompatibilityWithDevice {
  return {
    id: d.id,
    deviceId: d.id,
    osId: 1,
    status,
    supportType,
    experience: "good",
    notes: null,
    device: d,
  };
}

const IOS_26 = os({ id: 19, name: "iOS 26.4", releaseYear: 2025 });
const IOS_18 = os({ id: 18, name: "iOS 18.7.7", releaseYear: 2024 });
const IOS_27_BETA = os({ id: 20, name: "iOS 27", releaseYear: 2026, isFuture: true });
const IPHONE_12 = device({ id: 12, name: "iPhone 12", releaseYear: 2020 });

// ---------------------------------------------------------------------------
// Versione più recente del catalogo
// ---------------------------------------------------------------------------

test("la versione più recente ignora quelle dichiarate future", () => {
  assert.equal(newestReleasedOs([IOS_18, IOS_26, IOS_27_BETA])?.id, IOS_26.id);
});

test("un catalogo vuoto o senza anni non produce una versione più recente", () => {
  assert.equal(newestReleasedOs([]), null);
  assert.equal(newestReleasedOs([os({ id: 1, name: "iOS ?", releaseYear: null })]), null);
});

// ---------------------------------------------------------------------------
// Supporto di un dispositivo
// ---------------------------------------------------------------------------

test("gli anni di supporto sono misurati, non promessi", () => {
  const insight = analyzeDeviceSupport({
    device: IPHONE_12,
    latestSupportedOs: IOS_26,
    rows: [osRow(IOS_26), osRow(IOS_18)],
  });
  assert.equal(insight.supportYears, 5);
});

test("un dispositivo fermo a una versione superata viene riconosciuto", () => {
  const insight = analyzeDeviceSupport({
    device: IPHONE_12,
    latestSupportedOs: IOS_18,
    rows: [osRow(IOS_18)],
    osCatalog: [IOS_18, IOS_26],
  });
  assert.equal(insight.stillSupported, false);
});

test("un dispositivo alla versione più recente risulta ancora supportato", () => {
  const insight = analyzeDeviceSupport({
    device: IPHONE_12,
    latestSupportedOs: IOS_26,
    rows: [osRow(IOS_26)],
    osCatalog: [IOS_18, IOS_26],
  });
  assert.equal(insight.stillSupported, true);
});

test("senza catalogo non si afferma nulla sul supporto in corso", () => {
  const insight = analyzeDeviceSupport({
    device: IPHONE_12,
    latestSupportedOs: IOS_26,
    rows: [osRow(IOS_26)],
  });
  assert.equal(insight.stillSupported, null);
});

test("previsioni e conferme sono contate separatamente", () => {
  const insight = analyzeDeviceSupport({
    device: IPHONE_12,
    latestSupportedOs: IOS_26,
    rows: [osRow(IOS_26, "predicted"), osRow(IOS_18), osRow(IOS_18, "opencore")],
  });
  assert.equal(insight.predictedCount, 1);
  assert.equal(insight.officialCount, 1);
});

test("senza dati di supporto non si scrive alcuna frase", () => {
  const insight = analyzeDeviceSupport({ device: IPHONE_12, latestSupportedOs: null, rows: [] });
  assert.equal(describeDeviceSupport(IPHONE_12, insight), null);
});

test("la frase dice fino a dove arriva e per quanti anni", () => {
  const insight = analyzeDeviceSupport({
    device: IPHONE_12,
    latestSupportedOs: IOS_26,
    rows: [osRow(IOS_26)],
    osCatalog: [IOS_18, IOS_26],
  });
  const text = describeDeviceSupport(IPHONE_12, insight)!;
  assert.match(text, /aggiornabile fino a iOS 26\.4/);
  assert.match(text, /5 anni dopo l'uscita/);
  assert.match(text, /riceve ancora aggiornamenti/);
});

test("la frase dichiara quando il dispositivo è rimasto indietro", () => {
  const insight = analyzeDeviceSupport({
    device: IPHONE_12,
    latestSupportedOs: IOS_18,
    rows: [osRow(IOS_18)],
    osCatalog: [IOS_18, IOS_26],
  });
  assert.match(describeDeviceSupport(IPHONE_12, insight)!, /Non riceve le versioni successive/);
});

test("un dispositivo uscito insieme al suo ultimo OS non produce «0 anni»", () => {
  const nuovo = device({ id: 18, name: "iPhone 18", releaseYear: 2025 });
  const insight = analyzeDeviceSupport({
    device: nuovo,
    latestSupportedOs: IOS_26,
    rows: [osRow(IOS_26)],
  });
  assert.equal(insight.supportYears, 0);
  assert.ok(!describeDeviceSupport(nuovo, insight)!.includes("0 anni"));
});

// ---------------------------------------------------------------------------
// Dispositivi di un sistema operativo
// ---------------------------------------------------------------------------

test("si contano solo i dispositivi realmente supportati", () => {
  const insight = analyzeOsSupport([
    deviceRow(device({ id: 1, name: "iPhone 11", releaseYear: 2019 })),
    deviceRow(device({ id: 2, name: "iPhone 12", releaseYear: 2020 })),
    deviceRow(device({ id: 3, name: "iPhone X", releaseYear: 2017 }), "official", "unsupported"),
  ]);
  assert.equal(insight.supportedCount, 2);
  assert.equal(insight.oldestSupported?.name, "iPhone 11");
  assert.equal(insight.newestSupported?.name, "iPhone 12");
});

test("le previsioni sono contate anche fra i dispositivi", () => {
  const insight = analyzeOsSupport([
    deviceRow(device({ id: 1, name: "iPhone 17", releaseYear: 2025 }), "predicted"),
    deviceRow(device({ id: 2, name: "iPhone 12", releaseYear: 2020 })),
  ]);
  assert.equal(insight.predictedCount, 1);
});

test("la frase non afferma la continuità della gamma", () => {
  // "dal iPhone 11 in poi" sarebbe falso se mancasse un modello intermedio.
  const insight = analyzeOsSupport([
    deviceRow(device({ id: 1, name: "iPhone 11", releaseYear: 2019 })),
    deviceRow(device({ id: 2, name: "iPhone 13", releaseYear: 2021 })),
  ]);
  const text = describeOsSupport(IOS_26, insight)!;
  assert.match(text, /2 dispositivi in archivio/);
  assert.match(text, /il più vecchio è iPhone 11 del 2019/);
  assert.ok(!text.includes("in poi"));
});

test("senza dispositivi non si scrive alcuna frase", () => {
  assert.equal(describeOsSupport(IOS_26, analyzeOsSupport([])), null);
});

// ---------------------------------------------------------------------------
// Trasparenza sulle previsioni
// ---------------------------------------------------------------------------

test("senza previsioni non compare alcun avviso", () => {
  assert.equal(describePredictions(0, 34), null);
});

test("l'avviso dichiara quante voci sono previsioni", () => {
  const text = describePredictions(8, 34)!;
  assert.match(text, /8 voci sono previsioni su 34/);
  assert.match(text, /non sono confermate dal produttore/);
});

test("l'avviso concorda al singolare", () => {
  assert.match(describePredictions(1, 10)!, /1 voce è una previsione su 10/);
});

test("un dispositivo con sole previsioni non viene descritto al presente", () => {
  // iPhone 18: in archivio ha una sola compatibilità, prevista. Dire "riceve
  // ancora aggiornamenti" sarebbe un'affermazione su un telefono non uscito.
  const iphone18 = device({ id: 18, name: "iPhone 18", releaseYear: 2026 });
  const insight = analyzeDeviceSupport({
    device: iphone18,
    latestSupportedOs: IOS_26,
    rows: [osRow(IOS_26, "predicted")],
    osCatalog: [IOS_18, IOS_26],
  });
  const text = describeDeviceSupport(iphone18, insight)!;
  assert.match(text, /Secondo le previsioni/);
  assert.match(text, /Nessuna di queste compatibilità è confermata dal produttore/);
  assert.ok(!text.includes("riceve ancora aggiornamenti"));
});

test("una previsione fra tante conferme non cambia la formulazione", () => {
  const insight = analyzeDeviceSupport({
    device: IPHONE_12,
    latestSupportedOs: IOS_26,
    rows: [osRow(IOS_26, "predicted"), osRow(IOS_18)],
    osCatalog: [IOS_18, IOS_26],
  });
  assert.match(describeDeviceSupport(IPHONE_12, insight)!, /è aggiornabile fino a/);
});

test("l'avviso concorda correttamente al singolare", () => {
  assert.match(describePredictions(1, 1)!, /non è confermata dal produttore e può cambiare/);
  assert.match(describePredictions(3, 9)!, /non sono confermate dal produttore e possono cambiare/);
});
