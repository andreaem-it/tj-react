import type { Device } from "@/lib/compatibility/types";
import { getSpecEntries, translateSpecLabel } from "@/lib/compatibility/specs";

export interface SpecComparisonRow {
  key: string;
  label: string;
  a: unknown;
  b: unknown;
  /** Nessuno dei due valori è assente e sono diversi tra loro. */
  differs: boolean;
}

/** Assente da entrambi i lati: una riga così non aggiunge informazione al confronto. */
function isAbsent(value: unknown): boolean {
  return value === undefined;
}

/**
 * Righe di confronto fra le `specs` di due dispositivi.
 *
 * Unione delle chiavi di entrambi, non intersezione: un dispositivo può avere
 * una specifica che l'altro non ha (es. Ultra Wideband solo su alcuni
 * modelli), ed è un'informazione del confronto tanto quanto un valore
 * diverso — nasconderla perché l'altro dispositivo non la definisce
 * mostrerebbe un confronto meno completo di quello vero.
 *
 * Ordine: prima le chiavi di `deviceA` (nell'ordine restituito dal backend,
 * che è quello con cui la scheda singola le mostra), poi le chiavi
 * aggiuntive di `deviceB`. Deterministico e stabile a parità di dati.
 */
export function buildSpecComparisonRows(deviceA: Device, deviceB: Device): SpecComparisonRow[] {
  const entriesA = new Map(getSpecEntries(deviceA));
  const entriesB = new Map(getSpecEntries(deviceB));

  const orderedKeys: string[] = [];
  const seen = new Set<string>();
  for (const key of entriesA.keys()) {
    if (!seen.has(key)) {
      seen.add(key);
      orderedKeys.push(key);
    }
  }
  for (const key of entriesB.keys()) {
    if (!seen.has(key)) {
      seen.add(key);
      orderedKeys.push(key);
    }
  }

  return orderedKeys.map((key) => {
    const a = entriesA.get(key);
    const b = entriesB.get(key);
    return {
      key,
      label: translateSpecLabel(key),
      a,
      b,
      differs: !isAbsent(a) && !isAbsent(b) && JSON.stringify(a) !== JSON.stringify(b),
    };
  });
}
