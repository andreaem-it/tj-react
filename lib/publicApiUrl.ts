/**
 * Risoluzione della base URL pubblica di tj-api, condivisa da browser e SSR.
 *
 * Modulo volutamente minimo: viene importato anche da componenti client
 * (`ArticleBody`), dove tirarsi dietro tutto `tjApiClient` sarebbe peso morto
 * nel bundle.
 *
 * - `NEXT_PUBLIC_TJ_API_BASE_URL` impostata → URL assoluto verso tj-api, il
 *   browser chiama il backend diretto (una sola function invocation).
 * - assente → path relativo `/api/...`, che passa dal proxy Next (due
 *   invocation: proxy + tj-api). È il comportamento storico.
 */

/** Base pubblica tj-api, o null se non configurata (stringa vuota = assente). */
export function getPublicTjApiBaseUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_TJ_API_BASE_URL;
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  if (!t) return null;
  return t.replace(/\/$/, "");
}

function normalizePath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

/** URL verso tj-api (`https://…/api/…`) oppure path relativo `/api/…` per il proxy Next. */
export function resolvePublicApiUrl(path: string): string {
  const base = getPublicTjApiBaseUrl();
  const p = normalizePath(path);
  if (base) return `${base}${p}`;
  return p;
}
