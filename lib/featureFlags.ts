/**
 * Feature flag server-side configurabili da ambiente.
 *
 * I flag sono volutamente dichiarati in un registro chiuso: un refuso nel nome
 * non deve creare implicitamente una nuova feature. I valori assenti mantengono
 * il default, mentre `1`, `true`, `yes` e `on` abilitano esplicitamente il flag.
 */
export const FEATURE_FLAGS = {
  topicHubs: { env: "FEATURE_TOPIC_HUBS", defaultEnabled: true },
  priceRadar: { env: "FEATURE_PRICE_RADAR", defaultEnabled: true },
  compatibility: { env: "FEATURE_COMPATIBILITY", defaultEnabled: true },
  webPush: { env: "FEATURE_WEB_PUSH", defaultEnabled: true },
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

const ENABLED_VALUES = new Set(["1", "true", "yes", "on"]);
const DISABLED_VALUES = new Set(["0", "false", "no", "off"]);

export function parseFeatureFlag(value: string | undefined, fallback: boolean): boolean {
  if (value == null || value.trim() === "") return fallback;

  const normalized = value.trim().toLowerCase();
  if (ENABLED_VALUES.has(normalized)) return true;
  if (DISABLED_VALUES.has(normalized)) return false;

  return fallback;
}

export function isFeatureEnabled(
  flag: FeatureFlag,
  env: Readonly<Record<string, string | undefined>> = process.env,
): boolean {
  const config = FEATURE_FLAGS[flag];
  return parseFeatureFlag(env[config.env], config.defaultEnabled);
}
