/**
 * URL base del backend tj-api (senza slash finale).
 * Esempio: http://localhost:3003 oppure https://api.example.com
 * Le route Price Radar vengono inoltrate su `${TJ_API_BASE_URL}` + path identico
 * (es. `/api/price-radar/products`, `/api/admin/price-radar/status`).
 */
export const TJ_API_BASE_URL = (process.env.TJ_API_BASE_URL ?? "").trim();

export function getTjApiBaseUrl(): string | null {
  if (!TJ_API_BASE_URL) return null;
  return TJ_API_BASE_URL.replace(/\/$/, "");
}
