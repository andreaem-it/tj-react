export const SITE_THEME_STORAGE_KEY = "techjournal-theme";
const LEGACY_SITE_THEME_STORAGE_KEY = "theme";

export type SiteTheme = "light" | "dark" | "glass";

/** Preferenza salvata; in sua assenza il sito parte sempre in dark mode. */
export function getStoredOrPreferredTheme(): SiteTheme {
  if (typeof window === "undefined") return "dark";
  try {
    const stored = (window.localStorage.getItem(SITE_THEME_STORAGE_KEY) ??
      window.localStorage.getItem(LEGACY_SITE_THEME_STORAGE_KEY)) as SiteTheme | null;
    if (stored === "light" || stored === "dark" || stored === "glass") return stored;
  } catch {
    // Storage disabilitato o non disponibile: mantieni il default del sito.
  }
  return "dark";
}

export function applySiteThemeToDocument(theme: SiteTheme): void {
  document.documentElement.classList.toggle("glass", theme === "glass");
  document.documentElement.classList.toggle("dark", theme !== "light");
}

/** Applica e salva il tema. Il cookie è il fallback quando localStorage non è disponibile. */
export function setSiteTheme(theme: SiteTheme): void {
  try {
    window.localStorage.setItem(SITE_THEME_STORAGE_KEY, theme);
  } catch {
    // Il cookie sottostante mantiene comunque la preferenza fra i reload.
  }
  try {
    document.cookie = `${SITE_THEME_STORAGE_KEY}=${theme}; Path=/; Max-Age=31536000; SameSite=Lax`;
  } catch {
    // Anche con cookie bloccati il cambio resta attivo per la sessione corrente.
  }
  applySiteThemeToDocument(theme);
}

/** Per useSyncExternalStore: tema da classe `dark` su `<html>`. */
export function getSiteThemeFromDom(): SiteTheme {
  if (typeof document === "undefined") return "dark";
  if (document.documentElement.classList.contains("glass")) return "glass";
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
    if (e.key === SITE_THEME_STORAGE_KEY) {
      if (e.newValue === "light" || e.newValue === "dark" || e.newValue === "glass") {
        applySiteThemeToDocument(e.newValue);
      }
      onChange();
    } else if (e.key === null) {
      applySiteThemeToDocument(getStoredOrPreferredTheme());
      onChange();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    mo.disconnect();
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * Eseguito nel `<head>` prima del paint: applica la preferenza salvata.
 * Senza una preferenza valida (o se localStorage non è disponibile) mantiene il default dark.
 */
export const SITE_THEME_BOOTSTRAP_SCRIPT =
  '(function(){var r=document.documentElement;var t=null;try{t=localStorage.getItem("techjournal-theme")||localStorage.getItem("theme");}catch(e){}if(!t){var m=document.cookie.match(/(?:^|;\\s*)techjournal-theme=(light|dark|glass)(?:;|$)/);t=m&&m[1];}var glass=t==="glass";var dark=t!=="light";r.classList.toggle("glass",glass);r.classList.toggle("dark",dark);})();';
