import assert from "node:assert/strict";
import { test } from "node:test";
import { orderedSectionIds, type HomeSectionConfig } from "@/lib/home/sections";

function section(overrides: Partial<HomeSectionConfig> & { id: string; priority: number }): HomeSectionConfig {
  return {
    type: "latest",
    enabled: true,
    ...overrides,
  };
}

const SECTIONS: HomeSectionConfig[] = [
  section({ id: "a", priority: 30 }),
  section({ id: "b", priority: 10 }),
  section({ id: "c", priority: 20 }),
  section({ id: "d", priority: 5, enabled: false }),
];

test("ordina i candidati per priority crescente, non per ordine di richiesta", () => {
  assert.deepEqual(orderedSectionIds(["a", "b", "c"], SECTIONS), ["b", "c", "a"]);
});

test("un candidato disabilitato non compare anche se la priority è la più bassa", () => {
  assert.deepEqual(orderedSectionIds(["a", "b", "d"], SECTIONS), ["b", "a"]);
});

test("un ID assente dal registro non compare e non genera errori", () => {
  assert.deepEqual(orderedSectionIds(["a", "non-esiste", "b"], SECTIONS), ["b", "a"]);
});

test("nessun candidato richiesto: array vuoto", () => {
  assert.deepEqual(orderedSectionIds([], SECTIONS), []);
});

test("cambiare la priority nella configurazione cambia l'ordine risultante", () => {
  const reordered = SECTIONS.map((s) => (s.id === "a" ? { ...s, priority: 1 } : s));
  assert.deepEqual(orderedSectionIds(["a", "b", "c"], reordered), ["a", "b", "c"]);
});
