/**
 * URL base del backend tj-api (senza slash finale).
 * Esempio: http://localhost:3003 oppure https://api.example.com
 * Route proxy (stesso path): Price Radar, compatibilità pubblica (`/api/compatibility/*`), articoli, ecc.
 */
export const TJ_API_BASE_URL = (process.env.TJ_API_BASE_URL ?? "").trim();

export function getTjApiBaseUrl(): string | null {
  if (!TJ_API_BASE_URL) return null;
  return TJ_API_BASE_URL.replace(/\/$/, "");
}
