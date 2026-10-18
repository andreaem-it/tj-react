import type { Device } from "@/lib/compatibility/types";

export type UpgradeVerdict = "strong" | "good" | "specific" | "wait" | "downgrade";
export type UpgradeImpact = "high" | "medium" | "low";

export interface UpgradeReason {
  id: string;
  title: string;
  description: string;
  weight: number;
}

export interface IphoneUpgradeAssessment {
  verdict: UpgradeVerdict;
  impact: UpgradeImpact;
  score: number;
  title: string;
  summary: string;
  benefits: UpgradeReason[];
  cautions: UpgradeReason[];
  isPreliminary: boolean;
  generationGap: number | null;
}

type NormalizedIphone = {
  ramGB: number | null;
  displayInches: number | null;
  hasOled: boolean | null;
  hasPromotion: boolean;
  connector: string | null;
  biometrics: string | null;
  baseStorageGB: number | null;
  maxStorageGB: number | null;
  appleIntelligence: boolean;
};

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function storageValues(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is number => typeof item === "number" && Number.isFinite(item));
}

export function normalizeIphone(device: Device): NormalizedIphone {
  const specs = device.specs ?? {};
  const display = stringValue(specs.display);
  const storage = storageValues(specs.storageOptionsGB);
  const ramGB = numberValue(specs.ramGB) ?? ((numberValue(specs.ramMB) ?? 0) / 1024 || null);

  return {
    ramGB,
    displayInches: display ? numberValue(Number.parseFloat(display.replace(",", "."))) : null,
    hasOled: display ? /oled/i.test(display) : null,
    hasPromotion: display ? /promotion/i.test(display) : false,
    connector: stringValue(specs.connector),
    biometrics: stringValue(specs.biometrics),
    baseStorageGB: storage.length > 0 ? Math.min(...storage) : null,
    maxStorageGB: storage.length > 0 ? Math.max(...storage) : null,
    appleIntelligence: specs.appleIntelligence === true,
  };
}

/**
 * Modelli la cui disponibilità è confermata dal produttore ma che conservano
 * nel catalogo una nota editoriale scritta prima del lancio. Il registro evita
 * che una descrizione rimasta indietro trasformi un prodotto in vendita in una
 * previsione. Gli altri iPhone 18 restano preliminari finché non vengono
 * presentati ufficialmente.
 */
const OFFICIALLY_RELEASED_IPHONES = new Set([
  "iphone-18-pro",
  "iphone-18-pro-max",
]);

export function isUnconfirmedIphone(device: Device): boolean {
  if (OFFICIALLY_RELEASED_IPHONES.has(device.slug)) return false;
  const source = `${device.name} ${device.notes ?? ""}`;
  return /previst|ipotetic|indiscrezion|rumor|non ufficial/i.test(source);
}

function add(
  list: UpgradeReason[],
  id: string,
  title: string,
  description: string,
  weight: number,
): number {
  list.push({ id, title, description, weight });
  return weight;
}

function verdictFromScore(score: number): Exclude<UpgradeVerdict, "downgrade"> {
  if (score >= 75) return "strong";
  if (score >= 45) return "good";
  if (score >= 25) return "specific";
  return "wait";
}

function appleChipGeneration(device: Device): number | null {
  const match = device.chipset?.match(/\bA(\d+)\b/i);
  return match ? Number.parseInt(match[1], 10) : null;
}

const VERDICT_TITLE: Record<Exclude<UpgradeVerdict, "downgrade">, string> = {
  strong: "Sì, il salto è importante",
  good: "Sì, è un aggiornamento sensato",
  specific: "Dipende da cosa cerchi",
  wait: "Puoi tranquillamente aspettare",
};

/**
 * Motore editoriale deterministico per il confronto iPhone.
 *
 * Ogni frase è collegata a una differenza osservabile nel catalogo. Il
 * punteggio serve esclusivamente a scegliere il verdetto: non viene esposto
 * come una precisione scientifica che i dati non potrebbero sostenere.
 */
export function assessIphoneUpgrade(from: Device, to: Device): IphoneUpgradeAssessment {
  const current = normalizeIphone(from);
  const target = normalizeIphone(to);
  const benefits: UpgradeReason[] = [];
  const cautions: UpgradeReason[] = [];
  const generationGap =
    from.releaseYear != null && to.releaseYear != null ? to.releaseYear - from.releaseYear : null;

  if (generationGap != null && generationGap < 0) {
    return {
      verdict: "downgrade",
      impact: "low",
      score: 0,
      title: "Non sarebbe un aggiornamento",
      summary: `${to.name} è precedente a ${from.name}. Può avere senso solo per una caratteristica molto specifica o per ridurre la spesa, non come upgrade generale.`,
      benefits,
      cautions: [
        {
          id: "older-model",
          title: "Modello meno recente",
          description: "Avresti davanti meno anni di supporto e una piattaforma più vecchia.",
          weight: -40,
        },
      ],
      isPreliminary: isUnconfirmedIphone(to),
      generationGap,
    };
  }

  let score = 0;
  let regressionWeight = 0;
  if (generationGap != null) {
    if (generationGap >= 5) score += add(benefits, "age-major", "Un salto di più generazioni", `Fra i due modelli passano ${generationGap} anni: il miglioramento complessivo sarà chiaramente percepibile.`, 55);
    else if (generationGap >= 3) score += add(benefits, "age-clear", "Un salto generazionale netto", `I ${generationGap} anni di distanza sommano più evoluzioni hardware e allungano la vita utile del telefono.`, 38);
    else if (generationGap === 2) score += add(benefits, "age-moderate", "Due generazioni più avanti", "Ci sono miglioramenti concreti, anche se il telefono attuale può essere ancora perfettamente valido.", 24);
    else if (generationGap === 1) score += 8;
  }

  if (from.endOfSupportYear != null && to.releaseYear != null && from.endOfSupportYear <= to.releaseYear) {
    score += add(benefits, "support", "Più vita davanti", `${from.name} è arrivato o sta arrivando alla fine del suo ciclo di supporto; il passaggio ripristina un orizzonte software più lungo.`, 24);
  }

  if (current.ramGB != null && target.ramGB != null) {
    const ramDelta = target.ramGB - current.ramGB;
    if (ramDelta >= 4) score += add(benefits, "ram-major", "Più margine per app e funzioni future", `La memoria passa da ${current.ramGB} GB a ${target.ramGB} GB, con più respiro nel multitasking.`, 14);
    else if (ramDelta >= 2) score += add(benefits, "ram", "Più memoria disponibile", `La memoria passa da ${current.ramGB} GB a ${target.ramGB} GB.`, 8);
    else if (ramDelta <= -2) {
      const weight = add(cautions, "less-ram", "Meno memoria disponibile", `La memoria scende da ${current.ramGB} GB a ${target.ramGB} GB, riducendo il margine per multitasking e funzioni future.`, -10);
      score += weight;
      regressionWeight += Math.abs(weight);
    }
  }

  if (current.hasOled === false && target.hasOled === true) {
    score += add(benefits, "oled", "Schermo OLED", "Neri più profondi, contrasto superiore e una resa più incisiva rispetto al pannello LCD.", 12);
  } else if (current.hasOled === true && target.hasOled === false) {
    const weight = add(cautions, "lose-oled", "Passeresti da OLED a LCD", "Il display del modello scelto offre contrasto e neri meno profondi rispetto al tuo iPhone attuale.", -16);
    score += weight;
    regressionWeight += Math.abs(weight);
  }
  if (!current.hasPromotion && target.hasPromotion) {
    score += add(benefits, "promotion", "Scorrimento più fluido", "ProMotion rende animazioni, pagine e giochi sensibilmente più fluidi.", 12);
  } else if (current.hasPromotion && !target.hasPromotion) {
    const weight = add(cautions, "lose-promotion", "Perderesti ProMotion", "Il modello scelto non offre la stessa fluidità del display del tuo iPhone attuale.", -18);
    score += weight;
    regressionWeight += Math.abs(weight);
  }

  const currentChip = appleChipGeneration(from);
  const targetChip = appleChipGeneration(to);
  if (currentChip != null && targetChip != null && targetChip < currentChip) {
    const weight = add(cautions, "older-chip", "Chip di una generazione precedente", `${to.name} usa ${to.chipset}, meno recente di ${from.chipset}.`, -18);
    score += weight;
    regressionWeight += Math.abs(weight);
  }

  if (current.connector && target.connector && current.connector !== target.connector) {
    if (/usb.?c/i.test(target.connector)) {
      score += add(benefits, "usb-c", "Un solo cavo USB‑C", "Ricarica e accessori diventano più semplici da condividere con Mac, iPad e altri dispositivi.", 10);
    } else if (/30-pin/i.test(current.connector) && /lightning/i.test(target.connector)) {
      score += add(benefits, "connector", "Connessione più moderna", `Passi da ${current.connector} a ${target.connector}.`, 6);
    }
  }

  if (!current.appleIntelligence && target.appleIntelligence) {
    score += add(benefits, "apple-intelligence", "Supporto ad Apple Intelligence", "Il nuovo modello può usare le funzioni Apple Intelligence compatibili con la sua generazione.", 12);
  }

  if (current.baseStorageGB != null && target.baseStorageGB != null && target.baseStorageGB > current.baseStorageGB) {
    score += add(benefits, "base-storage", "Più spazio già dal modello base", `La capacità iniziale sale da ${current.baseStorageGB} GB a ${target.baseStorageGB} GB.`, 5);
  }
  if (current.maxStorageGB != null && target.maxStorageGB != null && target.maxStorageGB < current.maxStorageGB) {
    score += add(cautions, "max-storage", "Meno capacità massima", `La configurazione più capiente scende da ${current.maxStorageGB} GB a ${target.maxStorageGB} GB.`, -5);
  }

  if (current.displayInches != null && target.displayInches != null) {
    const displayDelta = target.displayInches - current.displayInches;
    if (displayDelta >= 0.6) {
      add(cautions, "larger-size", "Un telefono sensibilmente più grande", `Il display passa da ${current.displayInches.toFixed(1)}″ a ${target.displayInches.toFixed(1)}″: più spazio, ma minore compattezza.`, 0);
    } else if (displayDelta <= -0.6) {
      add(cautions, "smaller-size", "Uno schermo più piccolo", `Il display passa da ${current.displayInches.toFixed(1)}″ a ${target.displayInches.toFixed(1)}″.`, 0);
    }
  }

  score = Math.max(0, Math.min(100, score));
  if (regressionWeight >= 35 && score < 25) {
    return {
      verdict: "downgrade",
      impact: "low",
      score,
      title: "Il modello scelto è tecnologicamente inferiore",
      summary: `Passare da ${from.name} a ${to.name} comporterebbe rinunce importanti nell’esperienza quotidiana. Può avere senso soltanto se cerchi un formato specifico o vuoi ridurre la spesa.`,
      benefits: benefits.sort((a, b) => b.weight - a.weight),
      cautions,
      isPreliminary: isUnconfirmedIphone(to),
      generationGap,
    };
  }
  const verdict = verdictFromScore(score);
  const isPreliminary = isUnconfirmedIphone(to);
  const impact: UpgradeImpact = score >= 65 ? "high" : score >= 35 ? "medium" : "low";
  const lead = benefits[0]?.title.toLowerCase();
  const summary =
    verdict === "wait"
      ? `Le differenze fra ${from.name} e ${to.name} non cambiano abbastanza l’esperienza quotidiana da rendere il passaggio necessario.`
      : verdict === "specific"
        ? `Il passaggio da ${from.name} a ${to.name} ha senso soprattutto se per te contano ${lead ?? "le differenze evidenziate"}.`
        : `Passare da ${from.name} a ${to.name} porta miglioramenti concreti${lead ? `, a partire da ${lead}` : ""}.`;

  return {
    verdict,
    impact,
    score,
    title: VERDICT_TITLE[verdict],
    summary,
    benefits: benefits.sort((a, b) => b.weight - a.weight),
    cautions,
    isPreliminary,
    generationGap,
  };
}
