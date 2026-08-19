import { escapeRegExp } from "@/lib/content/text";

/**
 * Riconoscimento del modello esatto in un testo.
 *
 * Modulo puro. Serve a collegare una scheda di compatibilità agli articoli che
 * ne parlano e al prodotto monitorato corrispondente, senza che il database
 * resti l'isola che è oggi.
 *
 * ## Il problema che risolve
 *
 * Il nome di un modello è prefisso del nome di altri modelli: "iPhone 12" apre
 * "iPhone 12 Pro", "iPhone 12 Pro Max" e "iPhone 12 mini". Una ricerca per
 * sottostringa collegherebbe la scheda dell'iPhone 12 a un articolo che parla
 * solo del 12 Pro Max, cioè di un altro telefono con un altro prezzo e un altro
 * ciclo di aggiornamenti.
 *
 * Il registry degli argomenti non copre questo caso: contiene generazioni
 * (`iphone-17`, `iphone-18`), non i singoli modelli, e non ha alcuna voce per i
 * cinquantacinque dispositivi in archivio. Qui serve una regola più fine.
 */

/**
 * Parole che, subito dopo il nome, indicano un modello diverso.
 *
 * `e` è nell'elenco per "iPhone 16e": senza, la scheda dell'iPhone 16
 * rivendicherebbe gli articoli sul 16e.
 */
const MODEL_QUALIFIERS = [
  "pro",
  "max",
  "plus",
  "mini",
  "air",
  "ultra",
  "se",
  "e",
];

const QUALIFIER_PATTERN = MODEL_QUALIFIERS.join("|");

/**
 * Vero se il testo nomina **quel** modello e non una sua variante.
 *
 * Confini di parola su lettere e cifre Unicode invece di `\b`, per la stessa
 * ragione del matcher degli argomenti: `\b` ragiona su ASCII e su testo italiano
 * accentato produce confini dove non ce ne sono.
 */
export function mentionsDeviceExactly(text: string, deviceName: string): boolean {
  const name = deviceName.trim();
  if (!name || !text) return false;

  const pattern = new RegExp(
    `(?<![\\p{L}\\p{N}])${escapeRegExp(name)}(?![\\p{L}\\p{N}])(?!\\s+(?:${QUALIFIER_PATTERN})(?![\\p{L}\\p{N}]))`,
    "iu",
  );
  return pattern.test(text);
}

/**
 * Il modello più specifico fra quelli nominati in un testo.
 *
 * Serve quando si confronta un testo contro l'intero catalogo: "iPhone 12 Pro
 * Max" soddisfa il controllo per sé stesso e nessun altro, ma senza ordinare per
 * lunghezza il primo modello dell'elenco vincerebbe per caso.
 */
export function bestDeviceMatch<T extends { name: string }>(
  text: string,
  devices: readonly T[],
): T | null {
  let best: T | null = null;
  for (const device of devices) {
    if (!mentionsDeviceExactly(text, device.name)) continue;
    if (best === null || device.name.length > best.name.length) best = device;
  }
  return best;
}
