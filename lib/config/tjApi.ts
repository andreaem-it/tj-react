/**
 * URL base del backend tj-api (senza slash finale).
 * Esempio: http://localhost:3003 oppure https://api.example.com
 * Route proxy (stesso path): Price Radar, compatibilità pubblica (`/api/compatibility/*`), articoli, ecc.
 */
/** Aggiunge https:// se manca lo schema (es. env `backend.example.com`). */
export function normalizeTjApiBaseUrl(raw: string): string | null {
  const trimmed = raw.trim().replace(/\/$/, "");
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (!url.hostname) return null;
    return `${url.origin}${url.pathname}`.replace(/\/$/, "") || url.origin;
  } catch {
    return null;
  }
}

/**
 * Legge la variabile a richiesta, non durante la valutazione del modulo.
 *
 * `next build` importa i Route Handler per raccoglierne la configurazione, ma
 * le variabili del Worker sono disponibili solo a runtime. La loro assenza in
 * fase di build non deve quindi impedire la compilazione; i proxy restituiscono
 * già 503 quando questa funzione ritorna `null`.
 */
export function getTjApiBaseUrl(): string | null {
  return normalizeTjApiBaseUrl(process.env.TJ_API_BASE_URL ?? "");
}
