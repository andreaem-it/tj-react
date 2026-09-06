import type { PriceHistoryPoint } from "@/lib/priceRadar/types";

/**
 * Analisi dello storico prezzi: modulo puro, senza I/O e senza dipendenze.
 *
 * ## Perché ricalcolare le statistiche invece di usare `stats` dell'endpoint
 *
 * L'endpoint `/history` restituisce già `{ current, min, max, avg }`, e `min`,
 * `max` e `current` si usano così come sono. `avg` no, ed è l'unica statistica
 * che questo modulo ricalcola.
 *
 * `avg` upstream è la media **dei campioni**, non del prezzo nel tempo. Sui dati
 * reali di produzione il tracker non campiona a cadenza costante: sul prodotto
 * id 8 (Fire TV Stick 4K Max) 1006 rilevazioni su 1009 provengono da due
 * settimane di campionamento fitto — fino a 109 letture al giorno — a 79,99 €,
 * mentre il periodo recente a 52,99 € ne ha una al giorno. La media risultante
 * (79,94 €) descrive la cadenza dello scraper, non quanto è costato il prodotto.
 *
 * Misurato sul campione: lo scarto fra media per campione e media pesata sul
 * tempo arriva a −6,2% (id 8) e +11,5% (id 60). Un prodotto campionato più
 * spesso durante un saldo risulterebbe "caro" al suo prezzo normale.
 *
 * La media pesata sul tempo — ogni prezzo osservato vale per quanto è rimasto in
 * vigore — è quella che il lettore intende quando legge "di solito costa". Si
 * calcola dai soli punti reali: nessuna rilevazione inventata.
 *
 * ## Cosa non facciamo
 *
 * Non si interpolano prezzi mancanti e non si assume che un prezzo sia rimasto
 * valido per sempre. Se fra due rilevazioni passano due mesi, quei due mesi non
 * sono osservati: il prezzo viene portato avanti solo per
 * `CARRY_FORWARD_CAP_MS`, e il resto della finestra risulta scoperto. È la
 * differenza fra "il prezzo era 79,99 €" e "l'ultima volta che abbiamo guardato
 * era 79,99 €", e `coverage` la rende misurabile.
 */

/** Millisecondi in un giorno. */
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Per quanto una rilevazione vale come osservazione del prezzo corrente.
 *
 * Tre giorni: il tracker ricontrolla i prodotti attivi con un
 * `check_interval_minutes` dell'ordine delle ore (108 minuti sul prodotto id 8),
 * quindi un buco di più di tre giorni non è cadenza normale ma monitoraggio
 * interrotto — sul prodotto id 8 c'è un vuoto reale di 65 giorni fra il 9 giugno
 * e il 13 agosto. Portare avanti l'ultimo prezzo per tutto quel periodo
 * significherebbe affermare che non è cambiato, cosa che non sappiamo.
 */
const CARRY_FORWARD_CAP_MS = 3 * DAY_MS;

/**
 * Soglie di plausibilità di una rilevazione rispetto alla mediana della serie.
 *
 * Servono contro gli errori di feed (§25): l'AirPods a 2,49 € dopo mesi a
 * 249 € non deve diventare "minimo storico". Sono volutamente larghe: sul
 * campione reale il rapporto più basso fra minimo e mediana è 0,60 (id 8, uno
 * sconto vero del 40%), quindi 0,25 è una rete di sicurezza che non tocca
 * nessuno sconto legittimo osservato.
 */
const ANOMALY_LOW_RATIO = 0.25;
const ANOMALY_HIGH_RATIO = 4;

/**
 * Tolleranza entro cui un'altra rilevazione conferma un valore estremo.
 *
 * Un crollo reale viene rilevato più volte; un errore di lettura una volta sola.
 * Senza questa conferma un ribasso autentico e molto profondo verrebbe scartato
 * come anomalia, che è il modo peggiore di sbagliare: nasconderebbe proprio
 * l'offerta che il lettore cerca.
 */
const CORROBORATION_RATIO = 0.2;

/** Rilevazione normalizzata: timestamp in millisecondi e prezzo valido. */
export interface NormalizedPoint {
  t: number;
  price: number;
}

/** Statistiche su una finestra temporale, calcolate da sole rilevazioni reali. */
export interface WindowStats {
  /** Ampiezza della finestra in giorni; `null` per l'intero storico. */
  windowDays: number | null;
  min: number | null;
  max: number | null;
  /** Media pesata sul tempo (vedi nota in testa al modulo). */
  average: number | null;
  /** Rilevazioni ricadute nella finestra. */
  observationCount: number;
  /** Giorni di calendario distinti con almeno una rilevazione. */
  observationDays: number;
  /** Giorni fra la prima e l'ultima rilevazione della finestra. */
  spanDays: number;
  /**
   * Continuità delle rilevazioni nel periodo osservabile, fra 0 e 1.
   *
   * È il rapporto fra il tempo coperto dalle rilevazioni (ciascuna con il tetto
   * di `CARRY_FORWARD_CAP_MS`) e il tempo trascorso **dalla prima rilevazione
   * della finestra** a oggi — non l'intera ampiezza nominale della finestra.
   *
   * La distinzione conta: un prodotto monitorato da venti giorni, con una
   * rilevazione al giorno, non potrebbe mai superare 20/90 nella finestra a 90
   * giorni, e risulterebbe "storico a buchi" pur essendo osservato senza
   * interruzioni. Sono due domande diverse — *da quanto* guardiamo e *quanto
   * fittamente* — e la seconda è quella che dice se la media è affidabile. Alla
   * prima risponde `spanDays`.
   */
  coverage: number;
}

export interface HistoryAnalysis {
  /** Punti validi, ordinati per tempo crescente, senza anomalie. */
  points: NormalizedPoint[];
  /** Rilevazioni scartate perché implausibili rispetto alla serie. */
  discardedCount: number;
  /** Prima rilevazione utile, in millisecondi. */
  firstObservedAt: number | null;
  /** Ultima rilevazione utile, in millisecondi. */
  lastObservedAt: number | null;
  /** Statistiche per finestra, indicizzate per chiave di range. */
  windows: Record<HistoryRangeKey, WindowStats>;
}

/** Finestre offerte dall'interfaccia. `all` copre l'intero storico. */
export type HistoryRangeKey = "7d" | "30d" | "90d" | "365d" | "all";

export const HISTORY_RANGE_DAYS: Record<HistoryRangeKey, number | null> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "365d": 365,
  all: null,
};

/** Etichette brevi per i selettori di periodo. */
export const HISTORY_RANGE_LABEL: Record<HistoryRangeKey, string> = {
  "7d": "7 giorni",
  "30d": "30 giorni",
  "90d": "90 giorni",
  "365d": "1 anno",
  all: "Tutto",
};

export const HISTORY_RANGE_KEYS: readonly HistoryRangeKey[] = [
  "7d",
  "30d",
  "90d",
  "365d",
  "all",
];

function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Scarta le rilevazioni non utilizzabili.
 *
 * Due filtri distinti: quello formale (prezzo non finito, negativo o nullo,
 * timestamp non parsabile), che toglie dati rotti, e quello di plausibilità, che
 * toglie valori tecnicamente validi ma incompatibili con la serie **e non
 * confermati da nessun'altra rilevazione**.
 */
function normalizeAndFilter(points: readonly PriceHistoryPoint[]): {
  points: NormalizedPoint[];
  discardedCount: number;
} {
  const valid: NormalizedPoint[] = [];
  for (const point of points) {
    const price = typeof point?.price === "number" ? point.price : Number(point?.price);
    if (!Number.isFinite(price) || price <= 0) continue;
    const t = new Date(point.t).getTime();
    if (!Number.isFinite(t)) continue;
    valid.push({ t, price });
  }
  valid.sort((a, b) => a.t - b.t);

  const reference = median(valid.map((p) => p.price));
  if (reference === null || reference <= 0) {
    return { points: valid, discardedCount: 0 };
  }

  const low = reference * ANOMALY_LOW_RATIO;
  const high = reference * ANOMALY_HIGH_RATIO;

  const kept = valid.filter((point, index) => {
    if (point.price >= low && point.price <= high) return true;
    // Valore estremo: si tiene solo se un'altra rilevazione lo conferma.
    return valid.some(
      (other, otherIndex) =>
        otherIndex !== index &&
        Math.abs(other.price - point.price) <= point.price * CORROBORATION_RATIO,
    );
  });

  return { points: kept, discardedCount: valid.length - kept.length };
}

/**
 * Media pesata sul tempo su un intervallo.
 *
 * Ogni rilevazione pesa per quanto è rimasta l'ultima informazione disponibile,
 * al massimo `CARRY_FORWARD_CAP_MS`. La somma dei pesi, rapportata alla durata
 * dell'intervallo, è la copertura.
 */
function timeWeighted(
  points: readonly NormalizedPoint[],
  windowStart: number,
  windowEnd: number,
): { average: number | null; coverage: number } {
  const duration = windowEnd - windowStart;
  if (points.length === 0) return { average: null, coverage: 0 };

  let weightedSum = 0;
  let totalWeight = 0;

  for (let i = 0; i < points.length; i += 1) {
    const start = Math.max(points[i].t, windowStart);
    const nextObservation = i + 1 < points.length ? points[i + 1].t : Number.POSITIVE_INFINITY;
    const end = Math.min(nextObservation, points[i].t + CARRY_FORWARD_CAP_MS, windowEnd);
    const weight = end - start;
    if (weight <= 0) continue;
    weightedSum += points[i].price * weight;
    totalWeight += weight;
  }

  if (totalWeight <= 0) {
    /**
     * Nessuna durata misurabile: tutte le rilevazioni cadono sullo stesso
     * istante, o sull'estremo destro della finestra. La media semplice di quei
     * punti è l'unica risposta onesta, e la copertura resta zero a dichiararne
     * il limite.
     *
     * Questo ripiego era **irraggiungibile**: una guardia precedente usciva con
     * `average: null` appena `duration <= 0`, e la pagina finiva per mostrare
     * minimo e massimo reali accanto a una media vuota. La guardia ora esce solo
     * quando non ci sono punti del tutto.
     */
    const prices = points.map((p) => p.price);
    const simple = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    return { average: round2(simple), coverage: 0 };
  }

  return {
    average: round2(weightedSum / totalWeight),
    coverage: duration > 0 ? Math.min(1, totalWeight / duration) : 0,
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function statsForWindow(
  points: readonly NormalizedPoint[],
  windowDays: number | null,
  now: number,
): WindowStats {
  const firstT = points.length > 0 ? points[0].t : now;
  const windowStart = windowDays === null ? firstT : now - windowDays * DAY_MS;
  const inWindow = points.filter((p) => p.t >= windowStart && p.t <= now);

  if (inWindow.length === 0) {
    return {
      windowDays,
      min: null,
      max: null,
      average: null,
      observationCount: 0,
      observationDays: 0,
      spanDays: 0,
      coverage: 0,
    };
  }

  const prices = inWindow.map((p) => p.price);
  // La copertura si misura dalla prima rilevazione utile, non dall'inizio
  // nominale della finestra: vedi la nota su `coverage`.
  const { average, coverage } = timeWeighted(
    inWindow,
    Math.max(windowStart, inWindow[0].t),
    now,
  );
  const days = new Set(inWindow.map((p) => new Date(p.t).toISOString().slice(0, 10)));

  return {
    windowDays,
    min: round2(Math.min(...prices)),
    max: round2(Math.max(...prices)),
    average,
    observationCount: inWindow.length,
    observationDays: days.size,
    spanDays: (inWindow[inWindow.length - 1].t - inWindow[0].t) / DAY_MS,
    coverage,
  };
}

/**
 * Analizza una serie di rilevazioni e produce le statistiche per ogni finestra.
 *
 * `now` è un parametro e non `Date.now()` perché il risultato deve essere
 * riproducibile: senza, i test sarebbero legati al giorno in cui girano e il
 * render server produrrebbe valori diversi a ogni rigenerazione.
 */
export function analyzePriceHistory(
  points: readonly PriceHistoryPoint[],
  options: { now: number },
): HistoryAnalysis {
  const { points: clean, discardedCount } = normalizeAndFilter(points);
  const windows = {} as Record<HistoryRangeKey, WindowStats>;
  for (const key of HISTORY_RANGE_KEYS) {
    windows[key] = statsForWindow(clean, HISTORY_RANGE_DAYS[key], options.now);
  }

  return {
    points: clean,
    discardedCount,
    firstObservedAt: clean.length > 0 ? clean[0].t : null,
    lastObservedAt: clean.length > 0 ? clean[clean.length - 1].t : null,
    windows,
  };
}

/**
 * Riduce la serie ai soli punti in cui il prezzo cambia, più il primo e
 * l'ultimo.
 *
 * Non è un campionamento: su una serie a gradini — quale è un prezzo — le
 * rilevazioni ripetute allo stesso valore sono ridondanti per il disegno, e
 * toglierle non perde alcuna informazione sulla curva. Sul prodotto id 8 porta
 * 1034 punti a 6, cioè il payload RSC del grafico da decine di KB a poche
 * centinaia di byte.
 *
 * Le statistiche **non** si calcolano su questo risultato: la compressione
 * cancella la densità delle rilevazioni, che è ciò da cui `coverage` distingue
 * uno storico continuo da uno pieno di buchi. Si comprime solo ciò che va
 * disegnato.
 */
export function compressToChangePoints(
  points: readonly NormalizedPoint[],
): NormalizedPoint[] {
  if (points.length <= 2) return [...points];

  const out: NormalizedPoint[] = [points[0]];
  for (let i = 1; i < points.length - 1; i += 1) {
    const previous = points[i - 1];
    const current = points[i];
    const next = points[i + 1];

    // Si tiene il punto se il prezzo cambia entrando o uscendo: così il gradino
    // conserva entrambi gli spigoli e la data del cambio resta esatta.
    const isChange = current.price !== previous.price || current.price !== next.price;

    // …e lo si tiene anche se delimita un'interruzione del monitoraggio, pure a
    // prezzo invariato. Senza questa condizione la compressione cancellava
    // proprio gli estremi dei buchi: sul prodotto id 8 l'ultima rilevazione
    // prima dei due mesi di silenzio aveva lo stesso prezzo delle vicine e
    // spariva, così `findObservationGaps` restituiva intervalli i cui estremi
    // non esistevano più nella serie disegnata e il tratteggio non compariva
    // mai. Il grafico univa con linea piena due punti distanti due mesi, che è
    // esattamente l'affermazione che non vogliamo fare.
    const boundsGap =
      current.t - previous.t > CARRY_FORWARD_CAP_MS || next.t - current.t > CARRY_FORWARD_CAP_MS;

    if (isChange || boundsGap) out.push(current);
  }
  out.push(points[points.length - 1]);
  return out;
}

/**
 * Intervalli fra rilevazioni consecutive più lunghi del carry-forward.
 *
 * Il grafico li rende con un tratto diverso: unire due punti distanti due mesi
 * con una linea piena affermerebbe che il prezzo è rimasto fermo in mezzo.
 */
export function findObservationGaps(
  points: readonly NormalizedPoint[],
): Array<{ from: number; to: number }> {
  const gaps: Array<{ from: number; to: number }> = [];
  for (let i = 1; i < points.length; i += 1) {
    if (points[i].t - points[i - 1].t > CARRY_FORWARD_CAP_MS) {
      gaps.push({ from: points[i - 1].t, to: points[i].t });
    }
  }
  return gaps;
}

export { CARRY_FORWARD_CAP_MS, DAY_MS };
