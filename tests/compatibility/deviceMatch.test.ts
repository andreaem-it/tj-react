import assert from "node:assert/strict";
import { test } from "node:test";
import { bestDeviceMatch, mentionsDeviceExactly } from "@/lib/compatibility/deviceMatch";

test("riconosce il modello nominato", () => {
  assert.ok(mentionsDeviceExactly("Apple dichiara obsoleto l'iPhone 12", "iPhone 12"));
  assert.ok(mentionsDeviceExactly("iPhone 12: cosa cambia", "iPhone 12"));
});

test("una variante non vale per il modello base", () => {
  // È l'errore che rende inutilizzabile il confronto per sottostringa.
  assert.equal(mentionsDeviceExactly("Recensione iPhone 12 Pro Max", "iPhone 12"), false);
  assert.equal(mentionsDeviceExactly("iPhone 12 mini in offerta", "iPhone 12"), false);
  assert.equal(mentionsDeviceExactly("iPhone 16e: la vera novità", "iPhone 16"), false);
});

test("il modello con qualificatore riconosce sé stesso", () => {
  assert.ok(mentionsDeviceExactly("Recensione iPhone 12 Pro Max", "iPhone 12 Pro Max"));
  assert.ok(mentionsDeviceExactly("iPhone 16e: la vera novità", "iPhone 16e"));
});

test("un modello intermedio non rivendica quello più lungo", () => {
  assert.equal(mentionsDeviceExactly("Recensione iPhone 12 Pro Max", "iPhone 12 Pro"), false);
});

test("la punteggiatura chiude il nome", () => {
  assert.ok(mentionsDeviceExactly("iPhone 12, iOS 26 e altro", "iPhone 12"));
  assert.ok(mentionsDeviceExactly("(iPhone 12)", "iPhone 12"));
});

test("il numero deve combaciare", () => {
  assert.equal(mentionsDeviceExactly("iPhone 120 non esiste", "iPhone 12"), false);
  assert.equal(mentionsDeviceExactly("iPhone 1", "iPhone 12"), false);
});

test("il confronto ignora le maiuscole", () => {
  assert.ok(mentionsDeviceExactly("IPHONE 12 in sconto", "iPhone 12"));
});

test("testo o nome vuoti non producono corrispondenze", () => {
  assert.equal(mentionsDeviceExactly("", "iPhone 12"), false);
  assert.equal(mentionsDeviceExactly("iPhone 12", "  "), false);
});

test("fra più modelli nominati vince il più specifico", () => {
  const devices = [{ name: "iPhone 12" }, { name: "iPhone 12 Pro" }, { name: "iPhone 12 Pro Max" }];
  assert.equal(bestDeviceMatch("Recensione iPhone 12 Pro Max", devices)?.name, "iPhone 12 Pro Max");
  assert.equal(bestDeviceMatch("Apple dichiara obsoleto l'iPhone 12", devices)?.name, "iPhone 12");
});

test("nessun modello nominato non produce corrispondenze", () => {
  assert.equal(bestDeviceMatch("Apple rilascia iOS 27", [{ name: "iPhone 12" }]), null);
  assert.equal(bestDeviceMatch("iPhone 12", []), null);
});
