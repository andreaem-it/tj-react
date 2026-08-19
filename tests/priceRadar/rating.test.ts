import assert from "node:assert/strict";
import { test } from "node:test";
import type { WindowStats } from "@/lib/priceRadar/history";
import {
  describePriceRating,
  formatPercent,
  getPriceRating,
  PRICE_LEVEL_RANK,
} from "@/lib/priceRadar/rating";

/** Statistiche con storico abbondante: la confidenza non è l'oggetto del test. */
function solid(overrides: Partial<WindowStats>): WindowStats {
  return {
    windowDays: 90,
    min: 80,
    max: 120,
    average: 100,
    observationCount: 400,
    observationDays: 60,
    spanDays: 88,
    coverage: 0.95,
    ...overrides,
  };
}

function levelOf(currentPrice: number, stats: Partial<WindowStats> = {}) {
  return getPriceRating({ currentPrice, stats: solid(stats) }).level;
}

// ---------------------------------------------------------------------------
// La scala
// ---------------------------------------------------------------------------

test("al minimo storico il livello è minimo storico", () => {
  assert.equal(levelOf(80), "historical-low");
});

test("sotto il minimo registrato resta minimo storico", () => {
  assert.equal(levelOf(75), "historical-low");
});

test("un centesimo di arrotondamento non fa perdere il minimo storico", () => {
  assert.equal(levelOf(80.01), "historical-low");
});

test("vicino al minimo e ben sotto la media è ottimo prezzo", () => {
  // 83 è a +3,75% dal minimo (entro il 5%) e a −17% dalla media.
  assert.equal(levelOf(83), "excellent");
});

test("molto sotto la media ma lontano dal minimo è solo buon prezzo", () => {
  // −15% dalla media, ma +31% sul minimo: il prodotto ha avuto di meglio.
  assert.equal(levelOf(85, { min: 65 }), "good");
});

test("sotto la media oltre la banda di rumore è buon prezzo", () => {
  assert.equal(levelOf(96), "good");
});

test("dentro la banda di rumore è prezzo nella media", () => {
  assert.equal(levelOf(98), "average");
  assert.equal(levelOf(100), "average");
  assert.equal(levelOf(102), "average");
});

test("sopra la banda di rumore è prezzo alto", () => {
  assert.equal(levelOf(110), "high");
});

test("l'ordine di convenienza è coerente con la scala", () => {
  assert.ok(PRICE_LEVEL_RANK["historical-low"] < PRICE_LEVEL_RANK.excellent);
  assert.ok(PRICE_LEVEL_RANK.excellent < PRICE_LEVEL_RANK.good);
  assert.ok(PRICE_LEVEL_RANK.good < PRICE_LEVEL_RANK.average);
  assert.ok(PRICE_LEVEL_RANK.average < PRICE_LEVEL_RANK.high);
});

// ---------------------------------------------------------------------------
// Confidenza: il caso dominante sui dati reali di oggi
// ---------------------------------------------------------------------------

test("tre rilevazioni su tre giorni non bastano per un giudizio", () => {
  // Profilo di 16 prodotti su 18 nel catalogo reale.
  const rating = getPriceRating({
    currentPrice: 52.99,
    stats: solid({ observationCount: 3, observationDays: 3, spanDays: 3, coverage: 0.9 }),
  });
  assert.equal(rating.level, null);
  assert.equal(rating.confidence, "insufficient");
  assert.equal(rating.label, "Dati insufficienti");
});

test("uno storico intermedio dà un giudizio dichiarato come provvisorio", () => {
  const rating = getPriceRating({
    currentPrice: 96,
    stats: solid({ observationCount: 12, observationDays: 4, spanDays: 10, coverage: 0.5 }),
  });
  assert.equal(rating.confidence, "low");
  assert.equal(rating.level, "good");
});

test("uno storico a buchi non raggiunge la confidenza alta", () => {
  // Arco lungo e molti giorni di rilevazione, ma copertura bassa: è il profilo
  // del prodotto id 8, monitorato a marzo-giugno e poi fermo due mesi.
  const rating = getPriceRating({
    currentPrice: 96,
    stats: solid({ observationDays: 35, spanDays: 144, coverage: 0.2 }),
  });
  assert.equal(rating.confidence, "low");
});

test("anche senza giudizio si dichiarano le distanze già osservate", () => {
  const rating = getPriceRating({
    currentPrice: 90,
    stats: solid({ observationCount: 2, observationDays: 2, spanDays: 1, coverage: 0.5 }),
  });
  assert.equal(rating.level, null);
  assert.equal(rating.distanceFromHistoricalLow, 10);
  assert.equal(rating.discountVsAverage, 10);
});

// ---------------------------------------------------------------------------
// Valori assenti e degeneri
// ---------------------------------------------------------------------------

test("senza prezzo corrente non si esprime nulla", () => {
  assert.equal(getPriceRating({ currentPrice: null, stats: solid({}) }).confidence, "insufficient");
  assert.equal(getPriceRating({ currentPrice: 0, stats: solid({}) }).confidence, "insufficient");
  assert.equal(
    getPriceRating({ currentPrice: Number.NaN, stats: solid({}) }).confidence,
    "insufficient",
  );
});

test("senza statistiche non si esprime nulla", () => {
  const rating = getPriceRating({ currentPrice: 100, stats: null });
  assert.equal(rating.level, null);
  assert.equal(rating.confidence, "insufficient");
});

test("statistiche senza rilevazioni non producono un giudizio", () => {
  const vuote: WindowStats = {
    windowDays: 30,
    min: null,
    max: null,
    average: null,
    observationCount: 0,
    observationDays: 0,
    spanDays: 0,
    coverage: 0,
  };
  assert.equal(getPriceRating({ currentPrice: 100, stats: vuote }).level, null);
});

test("media a zero non provoca divisione per zero", () => {
  const rating = getPriceRating({ currentPrice: 100, stats: solid({ average: 0, min: 0 }) });
  assert.equal(rating.discountVsAverage, null);
  assert.equal(rating.distanceFromHistoricalLow, null);
  assert.equal(rating.level, null);
});

test("minimo assente ma media presente colloca comunque il prezzo", () => {
  const rating = getPriceRating({ currentPrice: 90, stats: solid({ min: null }) });
  assert.equal(rating.level, "good");
  assert.equal(rating.distanceFromHistoricalLow, null);
});

// ---------------------------------------------------------------------------
// Testi generati dai numeri
// ---------------------------------------------------------------------------

test("il testo del minimo storico non promette nulla oltre il dato", () => {
  const stats = solid({});
  const text = describePriceRating(getPriceRating({ currentPrice: 80, stats }), stats)!;
  assert.match(text, /prezzo più basso che abbiamo mai registrato/);
});

test("il testo riporta la percentuale rispetto alla media", () => {
  const stats = solid({});
  const text = describePriceRating(getPriceRating({ currentPrice: 90, stats }), stats)!;
  assert.match(text, /10% inferiore alla media/);
  assert.match(text, /10,00\s?€ dal minimo/);
});

test("con storico limitato il testo lo dichiara", () => {
  const stats = solid({ observationDays: 4, spanDays: 10, coverage: 0.5 });
  const text = describePriceRating(getPriceRating({ currentPrice: 90, stats }), stats)!;
  assert.match(text, /storico è ancora limitato/i);
});

test("senza storico il testo dice che il monitoraggio è appena iniziato", () => {
  const stats = solid({ observationCount: 3, observationDays: 2, spanDays: 2 });
  const text = describePriceRating(getPriceRating({ currentPrice: 90, stats }), stats)!;
  assert.match(text, /monitoraggio è appena iniziato/);
  assert.match(text, /3 rilevazioni/);
});

test("senza alcuna rilevazione il testo lo dice esplicitamente", () => {
  const vuote: WindowStats = {
    windowDays: null,
    min: null,
    max: null,
    average: null,
    observationCount: 0,
    observationDays: 0,
    spanDays: 0,
    coverage: 0,
  };
  const text = describePriceRating(getPriceRating({ currentPrice: 90, stats: vuote }), vuote)!;
  assert.match(text, /Non ci sono ancora rilevazioni/);
});

test("la percentuale usa il segno e la virgola italiani", () => {
  assert.equal(formatPercent(16.7), "−16,7%");
  assert.equal(formatPercent(-4), "+4%");
});
