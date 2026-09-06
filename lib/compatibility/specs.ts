import type { Device } from "@/lib/compatibility/types";

/**
 * Normalizzazione ed etichettatura delle `specs` libere del database
 * compatibilità (`Record<string, unknown>`, popolate a mano o in bulk).
 *
 * Modulo puro: nessuna JSX qui. Prima viveva dentro `DeviceDetailCard`, unico
 * consumatore finché è stato l'unico posto che mostrava le specifiche; con il
 * comparatore (`/compatibility/confronta`) sono diventati due, e duplicare il
 * dizionario delle etichette avrebbe voluto dire tenerne sincronizzate due
 * copie a mano.
 */

/** Normalizza chiave specs (camelCase / MAIUSCOLO / underscore) per lookup. */
export function normalizeSpecKey(key: string): string {
  return key.replace(/[\s_-]/g, "").toLowerCase();
}

/**
 * Etichette UI italiane per chiavi comunemente importate da JSON (bulk / ChatGPT).
 * Chiavi in minuscolo dopo `normalizeSpecKey`.
 */
const SPEC_LABEL_IT: Record<string, string> = {
  ramgb: "Memoria RAM (GB)",
  ram: "Memoria RAM",
  memorygb: "Memoria (GB)",
  display: "Schermo",
  schermo: "Schermo",
  screen: "Schermo",
  connector: "Connettore",
  connectortype: "Tipo di connettore",
  port: "Porta",
  biometrics: "Biometria",
  biometricsecurity: "Sicurezza biometrica",
  storageoptionsgb: "Capacità disponibili (GB)",
  storagegb: "Storage (GB)",
  storagetiers: "Tagli di storage",
  battery: "Batteria",
  batterymah: "Capacità batteria (mAh)",
  batterycapacity: "Capacità batteria",
  chipset: "Chip",
  soc: "SoC",
  cpu: "Processore",
  gpu: "GPU",
  weight: "Peso",
  weightg: "Peso (g)",
  dimensions: "Dimensioni",
  cellular: "Connessioni cellulari",
  wifi: "Wi‑Fi",
  bluetooth: "Bluetooth",
  ultrawideband: "Ultra Wideband",
  iprating: "Certificazione IP",
  waterproof: "Resistenza all’acqua",
  charging: "Ricarica",
  videorecording: "Registrazione video",
  cameraprimary: "Fotocamera principale",
  camerafrontal: "Fotocamera frontale",
  colors: "Colori disponibili",
  colorazioni: "Colori disponibili",
};

/** Valori: normalizzazioni leggere per termini tecnici ricorrenti nel testo. */
const SPEC_VALUE_FRAGMENT_IT: [RegExp, string][] = [
  [/super retina xdr/gi, "Super Retina XDR"],
  [/promotion\b/gi, "ProMotion"],
  [/oled\b/gi, "OLED"],
  [/lcd\b/gi, "LCD"],
  [/^\s*face\s*id\s*$/i, "Face ID"],
  [/^\s*touch\s*id\s*$/i, "Touch ID"],
  [/^\s*lightning\s*$/i, "Lightning"],
  [/usb[-\s]?c\b/gi, "USB‑C"],
];

export function translateSpecDisplayString(raw: string): string {
  let s = raw.trim();
  for (const [re, rep] of SPEC_VALUE_FRAGMENT_IT) {
    s = s.replace(re, rep);
  }
  s = s.replace(/^\s*thunderbolt\s*(\d+)?\s*$/i, (_, grp: string | undefined) =>
    grp ? `Thunderbolt ${grp}` : "Thunderbolt",
  );
  return s;
}

export function formatSimpleSpecBadge(item: unknown): string {
  if (item === null) return "—";
  if (typeof item === "string") return translateSpecDisplayString(item);
  return String(item);
}

export function translateSpecLabel(key: string): string {
  const n = normalizeSpecKey(key);
  if (SPEC_LABEL_IT[n]) return SPEC_LABEL_IT[n];
  /** Fallback leggibile da camelCase / snake_case */
  let split = key
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .trim();
  if (!split) return key;
  split = split.replace(/\s+/g, " ");
  const lower = split.toLowerCase();
  return split.charAt(0).toUpperCase() + lower.slice(1);
}

export function isRedundantSpec(key: string, value: unknown, device: Device): boolean {
  const k = key.toLowerCase();
  if (k === "name" && typeof value === "string" && value.trim() === device.name.trim()) return true;
  if (device.chipset && k === "chipset" && String(value).trim() === device.chipset.trim()) return true;
  return false;
}

export function getSpecEntries(device: Device): [string, unknown][] {
  const specs = device.specs;
  if (!specs || Object.keys(specs).length === 0) return [];
  return Object.entries(specs).filter(([key, value]) => !isRedundantSpec(key, value, device));
}
