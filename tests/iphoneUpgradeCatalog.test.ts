import assert from "node:assert/strict";
import { test } from "node:test";
import type { Device } from "@/lib/compatibility/types";
import { isUnconfirmedIphone, normalizeIphone } from "@/lib/iphoneUpgrade";
import { IPHONE_DUO, withOfficialComparatorDevices } from "@/lib/iphoneUpgradeCatalog";

const catalogDevice: Device = {
  id: 1,
  name: "iPhone 18 Pro",
  slug: "iphone-18-pro",
  type: "iphone",
  releaseYear: 2026,
  endOfSupportYear: null,
  chipset: "Apple A20 Pro",
  notes: null,
  imageUrl: null,
  imageR2Key: null,
  specs: null,
};

test("aggiunge iPhone Duo al catalogo del comparatore", () => {
  const devices = withOfficialComparatorDevices([catalogDevice]);
  assert.ok(devices.some((device) => device.slug === "iphone-duo"));
  assert.equal(isUnconfirmedIphone(IPHONE_DUO), false);

  const specs = normalizeIphone(IPHONE_DUO);
  assert.equal(specs.displayInches, 7.6);
  assert.equal(specs.hasOled, true);
  assert.equal(specs.hasPromotion, true);
  assert.equal(specs.baseStorageGB, 256);
  assert.equal(specs.maxStorageGB, 2048);
});

test("il record del backend sostituisce il fallback senza duplicati", () => {
  const backendDuo = { ...IPHONE_DUO, id: 99, notes: "Record del backend" };
  const devices = withOfficialComparatorDevices([catalogDevice, backendDuo]);
  const matches = devices.filter((device) => device.slug === "iphone-duo");

  assert.equal(matches.length, 1);
  assert.equal(matches[0]?.id, 99);
});

test("non maschera un catalogo completamente indisponibile", () => {
  assert.deepEqual(withOfficialComparatorDevices([]), []);
});
