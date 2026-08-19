import assert from "node:assert/strict";
import { test } from "node:test";
import { activeBreaking, type BreakingEntry } from "@/lib/home/overrides";

const NOW = Date.UTC(2026, 7, 17, 12, 0, 0);
const HOUR = 3_600_000;

function entry(overrides: Partial<BreakingEntry> & { slug: string }): BreakingEntry {
  return {
    href: `/apple/${overrides.slug}`,
    label: "Titolo breaking",
    kind: "breaking",
    expiresAt: new Date(NOW + HOUR).toISOString(),
    ...overrides,
  };
}

test("nessuna voce dichiarata: nessuna barra", () => {
  assert.equal(activeBreaking(NOW, []), null);
});

test("una voce scaduta non compare", () => {
  const scaduta = entry({ slug: "vecchia", expiresAt: new Date(NOW - HOUR).toISOString() });
  assert.equal(activeBreaking(NOW, [scaduta]), null);
});

test("una voce valida compare", () => {
  const valida = entry({ slug: "adesso" });
  assert.equal(activeBreaking(NOW, [valida])?.slug, "adesso");
});

test("la scadenza è esclusiva: allo scadere la barra è già spenta", () => {
  const alLimite = entry({ slug: "limite", expiresAt: new Date(NOW).toISOString() });
  assert.equal(activeBreaking(NOW, [alLimite]), null);
});

test("una scadenza illeggibile equivale a scaduta", () => {
  // Nel dubbio la barra non si accende: è l'errore meno grave dei due.
  assert.equal(activeBreaking(NOW, [entry({ slug: "rotta", expiresAt: "domani" })]), null);
});

test("fra più voci valide vince la priorità più bassa", () => {
  const scelta = activeBreaking(NOW, [
    entry({ slug: "secondaria", priority: 5 }),
    entry({ slug: "principale", priority: 1 }),
  ]);
  assert.equal(scelta?.slug, "principale");
});

test("senza priorità vince la voce che scade prima", () => {
  const scelta = activeBreaking(NOW, [
    entry({ slug: "lunga", expiresAt: new Date(NOW + 10 * HOUR).toISOString() }),
    entry({ slug: "urgente", expiresAt: new Date(NOW + 2 * HOUR).toISOString() }),
  ]);
  assert.equal(scelta?.slug, "urgente");
});

test("le voci scadute non partecipano alla scelta per priorità", () => {
  const scelta = activeBreaking(NOW, [
    entry({ slug: "scaduta-prioritaria", priority: 1, expiresAt: new Date(NOW - HOUR).toISOString() }),
    entry({ slug: "valida", priority: 9 }),
  ]);
  assert.equal(scelta?.slug, "valida");
});
