import type {
  CompatibilityWithDevice,
  CompatibilityWithOs,
  Device,
  OperatingSystem,
} from "@/lib/compatibility/types";

/**
 * Risposte editoriali ricavate dal database di compatibilità (§26).
 *
 * Modulo puro, senza I/O. Serve a far sì che le pagine **rispondano** invece di
 * limitarsi a esporre una tabella: chi cerca "iPhone 12" vuole sapere se riceve
 * ancora aggiornamenti, non leggere sei righe e dedurlo.
 *
 * Regola applicata ovunque: si afferma solo ciò che i dati dicono. Dove il
 * database non basta — per esempio "riceverà la prossima versione?" — la
 * funzione restituisce `null` e la pagina tace, invece di indovinare.
 */

/** Analisi del supporto software di un dispositivo. */
export interface DeviceSupportInsight {
  /** Versione più recente supportata, come dichiarata dal database. */
  latestOs: OperatingSystem | null;
  /**
   * Il dispositivo è fermo a una versione superata.
   *
   * `null` quando non è determinabile: senza il catalogo completo dei sistemi
   * operativi non si può dire se l'ultima versione supportata sia anche
   * l'ultima esistente.
   */
  stillSupported: boolean | null;
  /**
   * Anni di aggiornamenti osservati.
   *
   * Dalla data di uscita del dispositivo a quella dell'ultima versione che
   * riceve. È un dato misurato, non una promessa sul futuro.
   */
  supportYears: number | null;
  /** Righe confermate ufficialmente. */
  officialCount: number;
  /**
   * Righe che sono **previsioni**, non fatti.
   *
   * Nel database reale non sono un caso limite: su iOS 26.4, otto
   * collegamenti su trentaquattro sono previsti. Mostrarli senza distinguerli
   * significherebbe presentare una supposizione come una compatibilità
   * verificata.
   */
  predictedCount: number;
}

/** Versione più recente del catalogo, escluse quelle dichiarate future. */
export function newestReleasedOs(
  osList: readonly OperatingSystem[],
): OperatingSystem | null {
  let newest: OperatingSystem | null = null;
  for (const os of osList) {
    if (os.isFuture) continue;
    if (os.releaseYear == null) continue;
    if (newest === null || (newest.releaseYear ?? 0) < os.releaseYear) newest = os;
  }
  return newest;
}

export function analyzeDeviceSupport(params: {
  device: Device;
  latestSupportedOs: OperatingSystem | null;
  rows: readonly CompatibilityWithOs[];
  /** Catalogo completo dei sistemi operativi, per capire se il device è fermo. */
  osCatalog?: readonly OperatingSystem[];
}): DeviceSupportInsight {
  const { device, latestSupportedOs, rows, osCatalog } = params;

  let officialCount = 0;
  let predictedCount = 0;
  for (const row of rows) {
    if (row.supportType === "predicted") predictedCount += 1;
    else if (row.supportType === "official") officialCount += 1;
  }

  let stillSupported: boolean | null = null;
  if (osCatalog && osCatalog.length > 0 && latestSupportedOs) {
    const newest = newestReleasedOs(osCatalog);
    // Il confronto è per identificativo e non per anno: due versioni possono
    // uscire nello stesso anno.
    if (newest) stillSupported = newest.id === latestSupportedOs.id;
  }

  const supportYears =
    device.releaseYear != null && latestSupportedOs?.releaseYear != null
      ? Math.max(0, latestSupportedOs.releaseYear - device.releaseYear)
      : null;

  return {
    latestOs: latestSupportedOs,
    stillSupported,
    supportYears,
    officialCount,
    predictedCount,
  };
}

/**
 * Frase che risponde alla domanda del lettore, costruita dai soli dati.
 *
 * Restituisce `null` quando non c'è nulla di vero da dire: una frase generica
 * ("scopri la compatibilità di questo dispositivo") occuperebbe la riga più
 * visibile della pagina senza aggiungere niente.
 */
export function describeDeviceSupport(
  device: Device,
  insight: DeviceSupportInsight,
): string | null {
  if (!insight.latestOs) return null;

  const yearsClause =
    insight.supportYears != null && insight.supportYears > 0
      ? `, ${insight.supportYears} ${insight.supportYears === 1 ? "anno" : "anni"} dopo l'uscita`
      : "";

  /**
   * Quando **tutte** le righe sono previsioni, la frase deve dirlo.
   *
   * È il caso dei dispositivi non ancora usciti: l'iPhone 18 ha in archivio una
   * sola compatibilità, prevista, e la formulazione al presente sosteneva che
   * "riceve ancora aggiornamenti" — un'affermazione su un telefono che non
   * esiste. Il dato è utile, il modo di dirlo era sbagliato.
   */
  if (insight.officialCount === 0 && insight.predictedCount > 0) {
    return `Secondo le previsioni, ${device.name} dovrebbe essere aggiornabile fino a ${insight.latestOs.name}${yearsClause}. Nessuna di queste compatibilità è confermata dal produttore.`;
  }

  const parts: string[] = [
    `${device.name} è aggiornabile fino a ${insight.latestOs.name}${yearsClause}.`,
  ];

  if (insight.stillSupported === true) {
    parts.push(" È la versione più recente disponibile, quindi riceve ancora aggiornamenti.");
  } else if (insight.stillSupported === false) {
    parts.push(" Non riceve le versioni successive.");
  }

  return parts.join("");
}

/** Analisi dei dispositivi collegati a una versione di sistema operativo. */
export interface OsSupportInsight {
  supportedCount: number;
  predictedCount: number;
  /** Il dispositivo supportato più vecchio, per anno di uscita. */
  oldestSupported: Device | null;
  /** Il dispositivo supportato più recente. */
  newestSupported: Device | null;
}

export function analyzeOsSupport(rows: readonly CompatibilityWithDevice[]): OsSupportInsight {
  let supportedCount = 0;
  let predictedCount = 0;
  let oldest: Device | null = null;
  let newest: Device | null = null;

  for (const row of rows) {
    if (row.status !== "supported") continue;
    supportedCount += 1;
    if (row.supportType === "predicted") predictedCount += 1;

    const year = row.device.releaseYear;
    if (year == null) continue;
    if (oldest === null || (oldest.releaseYear ?? Number.MAX_SAFE_INTEGER) > year) {
      oldest = row.device;
    }
    if (newest === null || (newest.releaseYear ?? Number.MIN_SAFE_INTEGER) < year) {
      newest = row.device;
    }
  }

  return { supportedCount, predictedCount, oldestSupported: oldest, newestSupported: newest };
}

/**
 * Frase riassuntiva della pagina sistema operativo.
 *
 * Dice "il più vecchio supportato è X" e **non** "da X in poi": la seconda
 * formulazione afferma che tutti i modelli successivi sono compatibili, cosa che
 * il database non garantisce — basta un buco nell'elenco perché diventi falsa.
 */
export function describeOsSupport(
  os: OperatingSystem,
  insight: OsSupportInsight,
): string | null {
  if (insight.supportedCount === 0) return null;

  const parts: string[] = [
    `${os.name} è compatibile con ${insight.supportedCount} ${
      insight.supportedCount === 1 ? "dispositivo" : "dispositivi"
    } in archivio`,
  ];

  if (insight.oldestSupported) {
    const year = insight.oldestSupported.releaseYear;
    parts.push(
      `; il più vecchio è ${insight.oldestSupported.name}${year != null ? ` del ${year}` : ""}`,
    );
  }
  parts.push(".");

  return parts.join("");
}

/**
 * Avviso sulle previsioni, se ce ne sono.
 *
 * Separato dal riassunto perché è un'informazione di natura diversa: non dice
 * *cosa* sappiamo ma *quanto* possiamo affermarlo.
 */
export function describePredictions(predictedCount: number, total: number): string | null {
  if (predictedCount === 0) return null;
  const singular = predictedCount === 1;
  return `${predictedCount} ${singular ? "voce è una previsione" : "voci sono previsioni"} su ${total}: non ${
    singular ? "è confermata" : "sono confermate"
  } dal produttore e ${singular ? "può" : "possono"} cambiare.`;
}
