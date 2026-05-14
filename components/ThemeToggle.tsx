"use client";

import { useEffect, useState } from "react";
import {
  SITE_THEME_STORAGE_KEY,
  type SiteTheme,
  getStoredOrPreferredTheme,
  applySiteThemeToDocument,
} from "@/lib/siteTheme";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<SiteTheme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const initial = getStoredOrPreferredTheme();
    setTheme(initial);
    applySiteThemeToDocument(initial);
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next: SiteTheme = prev === "dark" ? "light" : "dark";
      applySiteThemeToDocument(next);
      window.localStorage.setItem(SITE_THEME_STORAGE_KEY, next);
      return next;
    });
  };

  const label =
    theme === "dark" ? "Passa al tema chiaro" : "Passa al tema scuro";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex items-center justify-center rounded-full border border-border bg-surface-overlay p-2 text-foreground hover:border-accent hover:text-accent transition-colors"
      aria-label={label}
      title={label}
    >
      {/* Evita mismatch visivo prima del montaggio: mostra sempre l'icona luna finché non è montato */}
      {mounted && theme === "light" ? (
        // Sole
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
      ) : (
        // Luna
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}

