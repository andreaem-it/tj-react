"use client";

import { useSyncExternalStore } from "react";
import {
  SITE_THEME_STORAGE_KEY,
  type SiteTheme,
  applySiteThemeToDocument,
  getSiteThemeFromDom,
  subscribeSiteThemeClass,
} from "@/lib/siteTheme";

export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeSiteThemeClass, getSiteThemeFromDom, () => "dark");

  const toggleTheme = () => {
    const next: SiteTheme = theme === "dark" ? "light" : "dark";
    setTheme(next);
  };

  const toggleGlassTheme = () => {
    setTheme(theme === "glass" ? "dark" : "glass");
  };

  const setTheme = (next: SiteTheme) => {
    applySiteThemeToDocument(next);
    window.localStorage.setItem(SITE_THEME_STORAGE_KEY, next);
  };

  const label =
    theme === "dark" ? "Passa al tema chiaro" : "Passa al tema scuro";

  return (
    <div className="flex items-center gap-1" role="group" aria-label="Aspetto del sito">
      <button
        type="button"
        onClick={toggleTheme}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface-overlay text-foreground transition-[color,border-color,background-color,box-shadow] hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label={label}
        title={label}
      >
        {theme === "light" ? (
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
      <button
        type="button"
        onClick={toggleGlassTheme}
        className="glass-theme-button inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface-overlay text-foreground transition-[color,border-color,background-color,box-shadow] hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label={theme === "glass" ? "Disattiva il tema vetro" : "Attiva il tema vetro"}
        aria-pressed={theme === "glass"}
        title={theme === "glass" ? "Disattiva tema vetro" : "Tema vetro"}
      >
        <svg
          className="h-[18px] w-[18px]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M4.5 8.2 12 3l7.5 5.2L12 13.4 4.5 8.2Z" />
          <path d="m4.5 12.1 7.5 5.2 7.5-5.2" opacity=".72" />
          <path d="m4.5 16 7.5 5 7.5-5" opacity=".45" />
        </svg>
      </button>
    </div>
  );
}
