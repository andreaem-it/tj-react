import type { WindowStats } from "@/lib/priceRadar/history";

/**
 * Valutazione algoritmica del prezzo.
 *
 * Modulo puro e deterministico: stessi numeri in ingresso, stessa valutazione in
 * uscita, sempre. Nessun modello linguistico decide se un prezzo è buono — un
 * LLM darebbe risposte diverse allo stesso input e non sarebbe verificabile, che
 * è l'opposto di ciò che serve a un dato di prezzo.
 *
 * Il rating è indipendente dal fatto che il link di acquisto sia affiliato: qui
 * non entra nessuna informazione commerciale, solo prezzo corrente, minimo,
 * media pesata sul tempo e quantità di storico.
 */

/** Livelli di valutazione, dal più conveniente al meno. */
export type PriceLevel = "historical-low" | "excellent" | "good" | "average" | "high";

/**
 * Quanto ci si può fidare della valutazione.
 *
 * `insufficient` non è un errore né un fallback tecnico: è la risposta corretta
 * per un prodotto appena entrato in monitoraggio. Sul catalogo reale, al momento
 * della scrittura, 16 prodotti su 18 campionati avevano da 2 a 4 rilevazioni su
 * 1-4 giorni — cioè il caso normale, non l'eccezione.
 */
export type RatingConfidence = "high" | "low" | "insufficient";

export interface PriceRating {
  /** `null` quando lo storico non basta a esprimere un giudizio. */
  level: PriceLevel | null;
  label: string;
  confidence: RatingConfidence;
  /** Scarto percentuale rispetto alla media; positivo = sotto la media. */
  discountVsAverage: number | null;
  /** Differenza in valuta rispetto al minimo osservato; 0 se è il minimo. */
  distanceFromHistoricalLow: number | null;
  /** Scarto percentuale rispetto al minimo osservato. */
  premiumOverHistoricalLow: number | null;
}

/**
 * Ampiezza della banda "nella media", in frazione della media.
 *
 * Ricavata dai passi di prezzo reali della serie: sul campione di produzione le
 * micro-oscillazioni valgono meno dell'1% (139,70 / 139,75 / 139,79 sul prodotto
 * id 90; 129,00 / 129,99 sul id 93), mentre le variazioni con un significato
 * commerciale partono dal 6% e arrivano al 35%. Il 3% cade nel mezzo: assorbe il
 * rumore di listino senza mangiarsi nessuno sconto vero osservato.
 */
const NEAR_AVERAGE_BAND = 0.03;

/**
 * Sconto sulla media oltre il quale il prezzo è "ottimo", da verificare
 * **insieme** alla vicinanza al minimo storico.
 *
 * Da sola la distanza dalla media non basta: un prodotto che ha appena avuto un
 * rialzo di listino risulterebbe scontatissimo rispetto alla media pur essendo
 * lontanissimo dal suo minimo.
 */
const EXCELLENT_DISCOUNT = 0.1;

/** Distanza massima dal minimo storico per considerare il prezzo "ottimo". */
const EXCELLENT_NEAR_LOW = 0.05;

/**
 * Tolleranza sul confronto col minimo storico.
 *
 * I prezzi hanno due decimali: un confronto esatto farebbe perdere il "minimo
 * storico" per un centesimo di arrotondamento a monte.
 */
const HISTORICAL_LOW_TOLERANCE = 0.011;

/**
 * Requisiti di storico per i tre livelli di confidenza.
 *
 * I valori cadono dentro uno stacco netto nei dati reali, quindi sono stabili.
 * Sul campione i giorni con rilevazioni sono 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 4,
 * 4, 4 e poi 17 e 35; l'arco temporale è 1,2-3,8 giorni e poi 83 e 144. Qualsiasi
 * soglia fra 5 e 17 giorni di rilevazioni separa gli stessi due gruppi.
 *
 * Fra i due si è scelto il valore alto anche per una ragione editoriale: tre
 * settimane sono il minimo perché "di solito costa" significhi qualcosa per chi
 * legge. Sotto, si sta descrivendo la settimana in corso, non un'abitudine.
 */
const HIGH_CONFIDENCE = { observationDays: 7, spanDays: 21, coverage: 0.4 };
const LOW_CONFIDENCE = { observationDays: 3, spanDays: 7, coverage: 0 };

export const PRICE_LEVEL_LABEL: Record<PriceLevel, string> = {
  "historical-low": "Minimo storico",
  excellent: "Ottimo prezzo",
  good: "Buon prezzo",
  average: "Prezzo nella media",
  high: "Prezzo alto",
};

/** Etichetta usata quando non c'è abbastanza storico per un giudizio. */
export const INSUFFICIENT_DATA_LABEL = "Dati insufficienti";

export interface PriceRatingInput {
  /** Prezzo corrente, dal prodotto o dall'ultima rilevazione. */
  currentPrice: number | null;
  /** Statistiche della finestra su cui si esprime il giudizio. */
  stats: WindowStats | null;
}

function confidenceOf(stats: WindowStats): RatingConfidence {
  if (
    stats.observationDays >= HIGH_CONFIDENCE.observationDays &&
    stats.spanDays >= HIGH_CONFIDENCE.spanDays &&
    stats.coverage >= HIGH_CONFIDENCE.coverage
  ) {
    return "high";
  }
  if (
    stats.observationDays >= LOW_CONFIDENCE.observationDays &&
    stats.spanDays >= LOW_CONFIDENCE.spanDays
  ) {
    return "low";
  }
  return "insufficient";
}

function pct(value: number): number {
  return Math.round(value * 1000) / 10;
}

/**
 * Valutazione del prezzo corrente rispetto allo storico.
 *
 * L'ordine dei confronti è quello della scala: si verifica prima il caso più
 * forte (minimo storico) e si scende. Un prezzo che è insieme minimo storico e
 * molto sotto la media è un minimo storico, che è l'informazione più utile.
 */
export function getPriceRating({ currentPrice, stats }: PriceRatingInput): PriceRating {
  const insufficient: PriceRating = {
    level: null,
    label: INSUFFICIENT_DATA_LABEL,
    confidence: "insufficient",
    discountVsAverage: null,
    distanceFromHistoricalLow: null,
    premiumOverHistoricalLow: null,
  };

  if (
    currentPrice == null ||
    !Number.isFinite(currentPrice) ||
    currentPrice <= 0 ||
    stats == null ||
    stats.observationCount === 0
  ) {
    return insufficient;
  }

  const confidence = confidenceOf(stats);
  const { min, average } = stats;

  // Distanza dal minimo: calcolabile e utile anche quando la confidenza è
  // bassa, perché è un confronto con un prezzo davvero osservato, non con una
  // media che richiede una serie densa per avere senso.
  const distanceFromHistoricalLow =
    min != null && min > 0 ? Math.round((currentPrice - min) * 100) / 100 : null;
  const premiumOverHistoricalLow =
    min != null && min > 0 ? pct((currentPrice - min) / min) : null;
  const discountVsAverage =
    average != null && average > 0 ? pct((average - currentPrice) / average) : null;

  if (confidence === "insufficient") {
    return {
      ...insufficient,
      distanceFromHistoricalLow,
      premiumOverHistoricalLow,
      discountVsAverage,
    };
  }

  const level = levelFor(currentPrice, min, average);
  return {
    level,
    label: level ? PRICE_LEVEL_LABEL[level] : INSUFFICIENT_DATA_LABEL,
    confidence: level ? confidence : "insufficient",
    discountVsAverage,
    distanceFromHistoricalLow,
    premiumOverHistoricalLow,
  };
}

function levelFor(
  currentPrice: number,
  min: number | null,
  average: number | null,
): PriceLevel | null {
  if (min != null && min > 0 && currentPrice <= min + HISTORICAL_LOW_TOLERANCE) {
    return "historical-low";
  }

  // Senza una media utilizzabile resta solo il confronto col minimo, che da solo
  // non colloca il prezzo su una scala: meglio non esprimere un livello.
  if (average == null || average <= 0) return null;

  const discount = (average - currentPrice) / average;
  const nearLow = min != null && min > 0 ? (currentPrice - min) / min <= EXCELLENT_NEAR_LOW : false;

  if (discount >= EXCELLENT_DISCOUNT && nearLow) return "excellent";
  if (discount >= NEAR_AVERAGE_BAND) return "good";
  if (discount > -NEAR_AVERAGE_BAND) return "average";
  return "high";
}

/**
 * Ordine di convenienza, per il ranking delle migliori occasioni.
 *
 * Numero basso = offerta migliore. Serve a `getBestCurrentDeals`: ordinare per
 * sconto nominale premierebbe i prodotti con il listino più gonfiato, che è
 * esattamente ciò che Price Radar deve smettere di fare.
 */
export const PRICE_LEVEL_RANK: Record<PriceLevel, number> = {
  "historical-low": 0,
  excellent: 1,
  good: 2,
  average: 3,
  high: 4,
};

// ---------------------------------------------------------------------------
// Testi derivati dai numeri (§12): nessuna chiamata a un modello.
// ---------------------------------------------------------------------------

const EURO = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

export function formatEuro(value: number, currency = "EUR"): string {
  if (currency === "EUR") return EURO.format(value);
  return new Intl.NumberFormat("it-IT", { style: "currency", currency }).format(value);
}

/** Percentuale con la virgola decimale italiana e il segno esplicito. */
export function formatPercent(value: number): string {
  const formatted = new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(Math.abs(value));
  return `${value < 0 ? "+" : "−"}${formatted}%`;
}

/**
 * Frase che spiega il rating, costruita dai soli numeri disponibili.
 *
 * Restituisce `null` quando non c'è nulla di vero da dire: un testo generico
 * ("un'ottima occasione da non perdere") sarebbe pubblicità, non informazione.
 */
export function describePriceRating(
  rating: PriceRating,
  stats: WindowStats | null,
  currency = "EUR",
): string | null {
  if (rating.confidence === "insufficient") {
    if (stats == null || stats.observationCount === 0) {
      return "Non ci sono ancora rilevazioni di prezzo per questo prodotto.";
    }
    const rilevazioni = stats.observationCount === 1 ? "rilevazione" : "rilevazioni";
    return `Il monitoraggio è appena iniziato: ${stats.observationCount} ${rilevazioni} su ${formatDays(stats.spanDays)}. Troppo poco per dire se il prezzo di oggi è conveniente.`;
  }

  const parti: string[] = [];

  if (rating.level === "historical-low") {
    parti.push("È il prezzo più basso che abbiamo mai registrato per questo prodotto.");
  } else if (rating.distanceFromHistoricalLow != null && rating.distanceFromHistoricalLow > 0) {
    parti.push(
      `Il prezzo è a ${formatEuro(rating.distanceFromHistoricalLow, currency)} dal minimo registrato.`,
    );
  }

  if (rating.discountVsAverage != null && Math.abs(rating.discountVsAverage) >= 1) {
    const verso = rating.discountVsAverage > 0 ? "inferiore" : "superiore";
    const valore = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 1 }).format(
      Math.abs(rating.discountVsAverage),
    );
    parti.push(`Il prezzo attuale è il ${valore}% ${verso} alla media registrata.`);
  } else if (rating.discountVsAverage != null) {
    parti.push("Il prezzo attuale è in linea con la media registrata.");
  }

  if (rating.confidence === "low") {
    parti.push("Lo storico è ancora limitato, quindi la valutazione può cambiare.");
  }

  return parti.length > 0 ? parti.join(" ") : null;
}

function formatDays(spanDays: number): string {
  const days = Math.max(1, Math.round(spanDays));
  return days === 1 ? "un giorno" : `${days} giorni`;
}
