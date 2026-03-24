const DEFAULT_SITE_URL = "https://www.techjournal.it";
const DEFAULT_API_BASE = "https://api.techjournal.it";

/**
 * Legge una env pubblica: stringa vuota o solo spazi conta come assente.
 * Così su Vercel un `NEXT_PUBLIC_API_BASE=` senza valore non produce URL relativi nelle fetch.
 */
function publicEnvUrl(name: string, fallback: string): string {
  const raw = process.env[name];
  if (typeof raw !== "string") return fallback;
  const t = raw.trim();
  return t.length > 0 ? t : fallback;
}

/** URL base del sito (per sitemap, canonical, Open Graph). */
export const SITE_URL = publicEnvUrl("NEXT_PUBLIC_SITE_URL", DEFAULT_SITE_URL);

/** Base per tutte le API dati (WordPress tj/v1, TechRadar). Le chiamate dati devono andare qui, non su www. */
export const API_BASE = publicEnvUrl("NEXT_PUBLIC_API_BASE", DEFAULT_API_BASE);

/** Base REST plugin tj/v1 (singolo post, liste, categorie). */
export const WP_BASE = publicEnvUrl(
  "NEXT_PUBLIC_WP_BASE",
  `${API_BASE}/wp-json/tj/v1`
);

/** Header per le chiamate a api.techjournal.it (evita blocchi da backend/firewall su Vercel). */
export const API_REQUEST_HEADERS: Record<string, string> = {
  "User-Agent": "TechJournal-Frontend/1.0 (+https://www.techjournal.it)",
  Accept: "application/json",
};

/** Log in console ogni chiamata all’API (utile per verificare che si usi api.techjournal.it). */
export function logApiUrl(url: string): void {
  console.log("[API]", url);
}

/** Placeholder blur per next/image: 8×8 grigio (mostrato durante il caricamento). */
export const BLUR_DATA_URL =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOCIgaGVpZ2h0PSI4IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSI4IiBoZWlnaHQ9IjgiIGZpbGw9IiMzZjNmNDZmIi8+PC9zdmc+";
