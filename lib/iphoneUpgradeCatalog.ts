import type { Device } from "@/lib/compatibility/types";

/**
 * Modelli ufficiali non ancora presenti nel catalogo storico usato dalla
 * sezione Compatibilità. Restano locali al comparatore e vengono sostituiti
 * automaticamente dall'eventuale record del backend con lo stesso slug.
 */
export const IPHONE_DUO: Device = {
  id: -20261023,
  name: "iPhone Duo",
  slug: "iphone-duo",
  type: "iphone",
  releaseYear: 2026,
  endOfSupportYear: null,
  chipset: "Apple A20 Pro",
  notes: "Presentato da Apple il 9 settembre 2026. Disponibile in Italia dal 23 ottobre 2026.",
  imageUrl: null,
  imageR2Key: null,
  specs: {
    display: '7.6" Super Retina XDR OLED pieghevole + 5.4" Super Retina XDR OLED esterno, ProMotion',
    connector: "USB-C",
    biometrics: "Touch ID",
    storageOptionsGB: [256, 512, 1024, 2048],
    wirelessCharging: "MagSafe e Qi2",
    appleIntelligence: true,
    formFactor: "Pieghevole",
  },
};

const OFFICIAL_COMPARATOR_DEVICES: readonly Device[] = [IPHONE_DUO];

export function withOfficialComparatorDevices(devices: readonly Device[]): Device[] {
  if (devices.length === 0) return [];

  const bySlug = new Map(OFFICIAL_COMPARATOR_DEVICES.map((device) => [device.slug, device]));
  for (const device of devices) bySlug.set(device.slug, device);
  return [...bySlug.values()];
}
