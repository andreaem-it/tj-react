/**
 * Check fail-fast delle variabili d'ambiente server-side.
 *
 * In produzione (build e runtime) una variabile critica mancante o malformata
 * deve fermare subito il processo con un errore esplicito, invece di produrre
 * 503 opachi su tutte le route proxy a runtime. In dev viene emesso solo un
 * warning chiaro (il proxy locale può non essere configurato).
 */
const IS_PROD = process.env.NODE_ENV === "production";

/**
 * Valida TJ_API_BASE_URL: chiamata a module-load da `lib/config/tjApi.ts`.
 *
 * @param raw valore grezzo di `process.env.TJ_API_BASE_URL`
 * @param normalized esito di `normalizeTjApiBaseUrl(raw)` (null = malformata/assente)
 */
export function checkTjApiBaseUrl(raw: string, normalized: string | null): void {
  if (normalized) return;

  const problem =
    raw.trim() === ""
      ? "mancante"
      : `malformata (valore attuale: "${raw}")`;
  const message =
    `[env] TJ_API_BASE_URL ${problem}. ` +
    "Impostare l'URL base del backend tj-api (es. https://api.example.com oppure http://127.0.0.1:3002): " +
    "senza questa variabile tutte le route proxy /api/* rispondono 503.";

  if (IS_PROD) {
    throw new Error(message);
  }
  console.warn(message);
}
