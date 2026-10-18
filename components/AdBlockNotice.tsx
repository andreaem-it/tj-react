"use client";

import { useEffect, useState } from "react";

const DISMISSED_AT_KEY = "techjournal:adblock-notice-dismissed-at";
const DISMISS_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

function wasRecentlyDismissed(): boolean {
  try {
    const dismissedAt = Number(window.localStorage.getItem(DISMISSED_AT_KEY));
    return Number.isFinite(dismissedAt) && Date.now() - dismissedAt < DISMISS_DURATION_MS;
  } catch {
    return false;
  }
}

function detectAdBlock(): Promise<boolean> {
  return new Promise((resolve) => {
    const bait = document.createElement("div");
    // Brave Shields applica i filtri cosmetici direttamente agli slot AdSense
    // reali, mentre non sempre intercetta le classi-esca generiche.
    bait.className = "adsbygoogle adsbox ad-banner ad-unit ad-placement";
    bait.setAttribute("aria-hidden", "true");
    bait.style.cssText =
      "position:absolute;left:-10000px;top:-10000px;width:1px;height:1px;pointer-events:none;";
    document.body.appendChild(bait);

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const styles = window.getComputedStyle(bait);
        const isBlocked =
          bait.offsetHeight === 0 ||
          bait.clientHeight === 0 ||
          styles.display === "none" ||
          styles.visibility === "hidden";

        bait.remove();
        resolve(isBlocked);
      });
    });
  });
}

export default function AdBlockNotice() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (wasRecentlyDismissed()) return;

    let cancelled = false;
    void detectAdBlock().then((isBlocked) => {
      if (!cancelled && isBlocked) setIsVisible(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!isVisible) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISSED_AT_KEY, String(Date.now()));
    } catch {
      // L'avviso resta comunque chiudibile se lo storage non è disponibile.
    }
    setIsVisible(false);
  };

  return (
    <aside
      className="border-b border-amber-400/30 bg-amber-400/10 text-foreground"
      aria-label="Supporta TechJournal"
      role="status"
    >
      <div className="mx-auto flex max-w-7xl items-start gap-3 px-[10px] py-3 sm:items-center sm:px-4 xl:px-12">
        <svg
          className="mt-0.5 h-5 w-5 shrink-0 text-accent sm:mt-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3 4.5 6v5.25c0 4.6 3.2 8.55 7.5 9.75 4.3-1.2 7.5-5.15 7.5-9.75V6L12 3Z" />
          <path strokeLinecap="round" d="M12 8v5m0 3h.01" />
        </svg>

        <p className="min-w-0 flex-1 text-sm leading-5 sm:text-[15px]">
          <strong className="font-semibold">TechJournal vive grazie alla pubblicità.</strong>{" "}
          Disattivando il tuo AdBlocker ci aiuti a sostenere il progetto e a continuare a offrire
          gratuitamente contenuti e servizi a tutti i lettori.
        </p>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="hidden min-h-11 shrink-0 items-center justify-center rounded-lg bg-accent px-4 text-sm font-semibold text-gray-950 transition-colors hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:inline-flex"
        >
          Ho disattivato: aggiorna
        </button>

        <button
          type="button"
          onClick={dismiss}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-overlay-strong hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label="Chiudi l’avviso per 30 giorni"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
      </div>

      <div className="px-[10px] pb-3 sm:hidden">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="flex min-h-11 w-full items-center justify-center rounded-lg bg-accent px-4 text-sm font-semibold text-gray-950 transition-colors hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Ho disattivato: aggiorna
        </button>
      </div>
    </aside>
  );
}
