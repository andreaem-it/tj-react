/** URL base del sito (per sitemap, canonical, Open Graph). */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.techjournal.it";

/** Base per tutte le API dati (WordPress tj/v1, TechRadar). Le chiamate dati devono andare qui, non su www. */
export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "https://api.techjournal.it";

/** Log in console ogni chiamata all’API (utile per verificare che si usi api.techjournal.it). */
export function logApiUrl(url: string): void {
  console.log("[API]", url);
}

/** Placeholder blur per next/image: 8×8 grigio (mostrato durante il caricamento). */
export const BLUR_DATA_URL =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOCIgaGVpZ2h0PSI4IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSI4IiBoZWlnaHQ9IjgiIGZpbGw9IiMzZjNmNDZmIi8+PC9zdmc+";
