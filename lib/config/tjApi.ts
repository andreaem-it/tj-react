import { checkTjApiBaseUrl } from "@/lib/config/env";

/**
 * URL base del backend tj-api (senza slash finale).
 * Esempio: http://localhost:3003 oppure https://api.example.com
 * Route proxy (stesso path): Price Radar, compatibilità pubblica (`/api/compatibility/*`), articoli, ecc.
 */
export const TJ_API_BASE_URL = (process.env.TJ_API_BASE_URL ?? "").trim();

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

export function getTjApiBaseUrl(): string | null {
  return normalizeTjApiBaseUrl(TJ_API_BASE_URL);
}

// Fail-fast a module-load: in produzione (build/runtime) una TJ_API_BASE_URL
// mancante o malformata lancia subito un errore esplicito; in dev solo warning.
checkTjApiBaseUrl(TJ_API_BASE_URL, getTjApiBaseUrl());
