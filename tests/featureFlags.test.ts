import assert from "node:assert/strict";
import test from "node:test";
import { isFeatureEnabled, parseFeatureFlag } from "@/lib/featureFlags";

test("usa il default quando il valore non è configurato o non è valido", () => {
  assert.equal(parseFeatureFlag(undefined, true), true);
  assert.equal(parseFeatureFlag("", false), false);
  assert.equal(parseFeatureFlag("forse", true), true);
});

test("riconosce i valori espliciti senza dipendere da maiuscole e spazi", () => {
  for (const value of ["1", "true", "YES", " on "]) {
    assert.equal(parseFeatureFlag(value, false), true);
  }
  for (const value of ["0", "false", "NO", " off "]) {
    assert.equal(parseFeatureFlag(value, true), false);
  }
});

test("legge il nome env dichiarato nel registro", () => {
  assert.equal(isFeatureEnabled("priceRadar", { FEATURE_PRICE_RADAR: "off" }), false);
  assert.equal(isFeatureEnabled("priceRadar", { FEATURE_PRICE_RADAR: "on" }), true);
  assert.equal(isFeatureEnabled("topicHubs", {}), true);
});
