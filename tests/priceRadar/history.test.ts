import assert from "node:assert/strict";
import { test } from "node:test";
import {
  analyzePriceHistory,
  compressToChangePoints,
  findObservationGaps,
  DAY_MS,
} from "@/lib/priceRadar/history";
import type { PriceHistoryPoint } from "@/lib/priceRadar/types";

/** Istante fisso: i test non devono dipendere dal giorno in cui girano. */
const NOW = Date.UTC(2026, 7, 17, 12, 0, 0);

function at(daysAgo: number, price: number): PriceHistoryPoint {
  return { t: new Date(NOW - daysAgo * DAY_MS).toISOString(), price };
}

// ---------------------------------------------------------------------------
// Media pesata sul tempo
// ---------------------------------------------------------------------------

test("la media pesa la durata, non il numero di rilevazioni", () => {
  // Riproduce il caso reale del prodotto id 8: campionamento fittissimo su un
  // prezzo, poi rilevazioni rade su un altro. La media per campione direbbe
  // ~100; quella pesata sul tempo deve stare in mezzo.
  const dense: PriceHistoryPoint[] = [];
  for (let i = 0; i < 200; i += 1) {
    dense.push({ t: new Date(NOW - 10 * DAY_MS + i * 60_000).toISOString(), price: 100 });
  }
  dense.push(at(2, 50));
  dense.push(at(1, 50));

  const { windows } = analyzePriceHistory(dense, { now: NOW });
  const media = windows["30d"].average!;
  const mediaPerCampione = (200 * 100 + 2 * 50) / 202;

  assert.ok(media < mediaPerCampione, `${media} deve essere sotto ${mediaPerCampione}`);
  assert.ok(media > 50 && media < 100, `${media} deve stare fra i due prezzi osservati`);
});

test("un buco lungo non viene riempito portando avanti il prezzo", () => {
  // 100 per un giorno, poi silenzio per 60 giorni, poi 50 per due giorni.
  const points = [at(65, 100), at(64, 100), at(2, 50), at(1, 50)];
  const { windows } = analyzePriceHistory(points, { now: NOW });
  const w = windows["90d"];

  // Se i 60 giorni di silenzio contassero come "prezzo a 100", la media
  // sarebbe vicinissima a 100.
  assert.ok(w.average! < 90, `media ${w.average} non deve assumere il prezzo nel vuoto`);
  assert.ok(w.coverage < 0.2, `copertura ${w.coverage} deve dichiarare lo storico a buchi`);
});

test("uno storico continuo ha copertura alta", () => {
  const points = Array.from({ length: 30 }, (_, i) => at(29 - i, 100));
  const { windows } = analyzePriceHistory(points, { now: NOW });
  assert.ok(windows["30d"].coverage > 0.9, `copertura ${windows["30d"].coverage}`);
  assert.equal(windows["30d"].average, 100);
});

// ---------------------------------------------------------------------------
// Finestre
// ---------------------------------------------------------------------------

test("ogni finestra vede solo le rilevazioni che le competono", () => {
  const points = [at(200, 300), at(60, 200), at(20, 150), at(3, 100)];
  const { windows } = analyzePriceHistory(points, { now: NOW });

  assert.equal(windows["7d"].observationCount, 1);
  assert.equal(windows["30d"].observationCount, 2);
  assert.equal(windows["90d"].observationCount, 3);
  assert.equal(windows.all.observationCount, 4);
  assert.equal(windows.all.min, 100);
  assert.equal(windows.all.max, 300);
  assert.equal(windows["30d"].min, 100);
  assert.equal(windows["30d"].max, 150);
});

test("una finestra senza rilevazioni non inventa statistiche", () => {
  const { windows } = analyzePriceHistory([at(200, 300)], { now: NOW });
  assert.deepEqual(
    {
      min: windows["7d"].min,
      max: windows["7d"].max,
      average: windows["7d"].average,
      count: windows["7d"].observationCount,
    },
    { min: null, max: null, average: null, count: 0 },
  );
});

test("i giorni di rilevazione contano le date, non i campioni", () => {
  const points = [at(5, 10), at(5, 10), at(5, 10), at(4, 10), at(3, 10)];
  const { windows } = analyzePriceHistory(points, { now: NOW });
  assert.equal(windows["30d"].observationCount, 5);
  assert.equal(windows["30d"].observationDays, 3);
});

// ---------------------------------------------------------------------------
// Dati sporchi e anomali
// ---------------------------------------------------------------------------

test("scarta prezzi non validi senza far cadere l'analisi", () => {
  const sporchi = [
    at(5, 100),
    { t: "non-una-data", price: 100 },
    { t: new Date(NOW).toISOString(), price: Number.NaN },
    { t: new Date(NOW).toISOString(), price: 0 },
    { t: new Date(NOW).toISOString(), price: -5 },
    at(1, 90),
  ] as PriceHistoryPoint[];

  const { points, windows } = analyzePriceHistory(sporchi, { now: NOW });
  assert.equal(points.length, 2);
  assert.equal(windows["30d"].min, 90);
  assert.equal(windows["30d"].max, 100);
});

test("un crollo isolato e implausibile non diventa il minimo", () => {
  // Il caso del prompt: AirPods a 249 e una lettura a 2,49.
  const points = [at(20, 249), at(15, 249), at(10, 2.49), at(5, 249), at(1, 249)];
  const { windows, discardedCount } = analyzePriceHistory(points, { now: NOW });
  assert.equal(discardedCount, 1);
  assert.equal(windows.all.min, 249);
});

test("un crollo confermato da altre rilevazioni resta nei dati", () => {
  // Ribasso profondo ma reale: se lo scartassimo nasconderemmo proprio
  // l'offerta che il lettore cerca.
  const points = [at(20, 249), at(15, 249), at(10, 60), at(9, 62), at(1, 249)];
  const { windows, discardedCount } = analyzePriceHistory(points, { now: NOW });
  assert.equal(discardedCount, 0);
  assert.equal(windows.all.min, 60);
});

test("una serie vuota non produce statistiche né errori", () => {
  const analysis = analyzePriceHistory([], { now: NOW });
  assert.deepEqual(analysis.points, []);
  assert.equal(analysis.firstObservedAt, null);
  assert.equal(analysis.windows.all.average, null);
  assert.equal(analysis.windows.all.coverage, 0);
});

test("una sola rilevazione dà minimo e massimo, non una media inventata", () => {
  const { windows } = analyzePriceHistory([at(0, 42)], { now: NOW });
  assert.equal(windows.all.min, 42);
  assert.equal(windows.all.max, 42);
  assert.equal(windows.all.observationCount, 1);
});

// ---------------------------------------------------------------------------
// Compressione e buchi
// ---------------------------------------------------------------------------

test("la compressione tiene entrambi gli spigoli del gradino", () => {
  const points = [
    { t: 1, price: 100 },
    { t: 2, price: 100 },
    { t: 3, price: 100 },
    { t: 4, price: 80 },
    { t: 5, price: 80 },
  ];
  assert.deepEqual(compressToChangePoints(points), [
    { t: 1, price: 100 },
    { t: 3, price: 100 },
    { t: 4, price: 80 },
    { t: 5, price: 80 },
  ]);
});

test("la compressione non altera una serie già minima", () => {
  const points = [
    { t: 1, price: 100 },
    { t: 2, price: 80 },
  ];
  assert.deepEqual(compressToChangePoints(points), points);
  assert.deepEqual(compressToChangePoints([]), []);
});

test("la compressione non cambia il primo e l'ultimo prezzo", () => {
  const points = Array.from({ length: 50 }, (_, i) => ({ t: i, price: i < 25 ? 10 : 20 }));
  const compressed = compressToChangePoints(points);
  assert.equal(compressed[0].price, 10);
  assert.equal(compressed[compressed.length - 1].price, 20);
  assert.ok(compressed.length < 6, `attesi pochi punti, ottenuti ${compressed.length}`);
});

test("la compressione conserva gli estremi di un buco anche a prezzo invariato", () => {
  // Senza questa garanzia gli intervalli di `findObservationGaps` avrebbero
  // estremi assenti dalla serie disegnata, e il tratteggio non comparirebbe.
  const points = [
    { t: NOW - 90 * DAY_MS, price: 100 },
    { t: NOW - 89 * DAY_MS, price: 100 },
    { t: NOW - 88 * DAY_MS, price: 100 },
    { t: NOW - 3 * DAY_MS, price: 100 },
    { t: NOW - 1 * DAY_MS, price: 80 },
  ];
  const compressed = compressToChangePoints(points);
  const gaps = findObservationGaps(points);

  assert.equal(gaps.length, 1);
  const times = new Set(compressed.map((p) => p.t));
  assert.ok(times.has(gaps[0].from), "l'inizio del buco deve sopravvivere alla compressione");
  assert.ok(times.has(gaps[0].to), "la fine del buco deve sopravvivere alla compressione");
});

test("gli estremi conservati sono adiacenti nella serie compressa", () => {
  // Il grafico riconosce un tratto come buco confrontando due punti
  // consecutivi: se fra loro ne restasse un terzo, il confronto fallirebbe.
  const points = [
    { t: NOW - 90 * DAY_MS, price: 100 },
    { t: NOW - 89 * DAY_MS, price: 100 },
    { t: NOW - 2 * DAY_MS, price: 100 },
    { t: NOW - 1 * DAY_MS, price: 100 },
  ];
  const compressed = compressToChangePoints(points);
  const [gap] = findObservationGaps(points);
  const fromIndex = compressed.findIndex((p) => p.t === gap.from);
  assert.ok(fromIndex >= 0);
  assert.equal(compressed[fromIndex + 1]?.t, gap.to);
});

test("i buchi più lunghi del carry-forward vengono segnalati", () => {
  const points = [
    { t: NOW - 60 * DAY_MS, price: 100 },
    { t: NOW - 59 * DAY_MS, price: 100 },
    { t: NOW - 2 * DAY_MS, price: 80 },
  ];
  const gaps = findObservationGaps(points);
  assert.equal(gaps.length, 1);
  assert.equal(gaps[0].from, NOW - 59 * DAY_MS);
});

test("rilevazioni ravvicinate non producono buchi", () => {
  const points = Array.from({ length: 10 }, (_, i) => ({ t: NOW - i * DAY_MS, price: 100 })).reverse();
  assert.deepEqual(findObservationGaps(points), []);
});

test("rilevazioni tutte allo stesso istante danno la media semplice, non null", () => {
  // Il ripiego per "nessuna durata misurabile" era irraggiungibile: una guardia
  // precedente usciva con `average: null`, e la pagina mostrava minimo e massimo
  // reali accanto a una media vuota.
  const stesso = new Date(NOW).toISOString();
  const { windows } = analyzePriceHistory(
    [
      { t: stesso, price: 10 },
      { t: stesso, price: 20 },
      { t: stesso, price: 30 },
    ],
    { now: NOW },
  );
  const w = windows.all;
  assert.equal(w.average, 20);
  assert.equal(w.min, 10);
  assert.equal(w.max, 30);
  // La copertura resta zero: è il modo di dichiarare che la media non è pesata.
  assert.equal(w.coverage, 0);
});

test("una sola rilevazione nell'istante corrente non produce NaN", () => {
  const { windows } = analyzePriceHistory([{ t: new Date(NOW).toISOString(), price: 42 }], {
    now: NOW,
  });
  const w = windows.all;
  assert.equal(w.average, 42);
  assert.ok(!Number.isNaN(w.coverage));
});
