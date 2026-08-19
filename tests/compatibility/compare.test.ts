import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSpecComparisonRows } from "@/lib/compatibility/compare";
import type { Device } from "@/lib/compatibility/types";

function device(overrides: Partial<Device>): Device {
  return {
    id: 1,
    name: "Device",
    slug: "device",
    type: "iphone",
    releaseYear: 2026,
    endOfSupportYear: null,
    chipset: null,
    notes: null,
    imageUrl: null,
    imageR2Key: null,
    specs: null,
    ...overrides,
  };
}

test("unione delle chiavi: una spec presente solo su un dispositivo resta visibile", () => {
  const a = device({ specs: { ramGB: 8, ultraWideband: true } });
  const b = device({ specs: { ramGB: 12 } });

  const rows = buildSpecComparisonRows(a, b);
  const byKey = new Map(rows.map((r) => [r.key, r]));

  assert.ok(byKey.has("ultraWideband"));
  assert.equal(byKey.get("ultraWideband")?.a, true);
  assert.equal(byKey.get("ultraWideband")?.b, undefined);
});

test("differs è true solo quando entrambi i valori esistono e sono diversi", () => {
  const a = device({ specs: { ramGB: 8, display: "6.1 pollici" } });
  const b = device({ specs: { ramGB: 12, display: "6.1 pollici" } });

  const rows = buildSpecComparisonRows(a, b);
  const byKey = new Map(rows.map((r) => [r.key, r]));

  assert.equal(byKey.get("ramGB")?.differs, true);
  assert.equal(byKey.get("display")?.differs, false);
});

test("un valore assente da un lato non conta come differenza", () => {
  const a = device({ specs: { ultraWideband: true } });
  const b = device({ specs: {} });

  const rows = buildSpecComparisonRows(a, b);
  assert.equal(rows[0].differs, false);
});

test("due dispositivi senza specs producono zero righe, non un errore", () => {
  const rows = buildSpecComparisonRows(device({}), device({}));
  assert.deepEqual(rows, []);
});

test("ordine deterministico: chiavi di A poi le sole aggiuntive di B", () => {
  const a = device({ specs: { z: 1, a: 2 } });
  const b = device({ specs: { a: 9, m: 3 } });

  const rows = buildSpecComparisonRows(a, b);
  assert.deepEqual(rows.map((r) => r.key), ["z", "a", "m"]);
});
