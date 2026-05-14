export const SITE_THEME_STORAGE_KEY = "theme";

export type SiteTheme = "light" | "dark";

/** Preferenza salvata o sistema; allineato al comportamento di ThemeToggle. */
export function getStoredOrPreferredTheme(): SiteTheme {
  if (typeof window === "undefined") return "dark";
  const stored = window.localStorage.getItem(SITE_THEME_STORAGE_KEY) as SiteTheme | null;
  if (stored === "light" || stored === "dark") return stored;
  const prefersDark =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

export function applySiteThemeToDocument(theme: SiteTheme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

/** Per useSyncExternalStore: tema da classe `dark` su `<html>`. */
export function getSiteThemeFromDom(): SiteTheme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

/**
 * Notifica cambi tema (toggle header o localStorage da altro tab).
 */
export function subscribeSiteThemeClass(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const html = document.documentElement;
  const mo = new MutationObserver(onChange);
  mo.observe(html, { attributes: true, attributeFilter: ["class"] });
  const onStorage = (e: StorageEvent) => {
    if (e.key === SITE_THEME_STORAGE_KEY || e.key === null) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    mo.disconnect();
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * Eseguito nel `<head>` prima del paint: applica `dark` su `<html>` da localStorage / prefers-color-scheme.
 * Serve a CSS variabili, iubenda e primo paint coerenti con ThemeToggle (layout React non forza più sempre dark).
 */
export const SITE_THEME_BOOTSTRAP_SCRIPT =
  '(function(){try{var k="theme";var t=localStorage.getItem(k);var r=document.documentElement;var p=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches;var dark=t==="dark"||(t!=="light"&&p);r.classList.toggle("dark",dark);}catch(e){}})();';
