"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import Script from "next/script";

const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID?.trim();

/**
 * Carica lo script di Google AdSense una sola volta (usare in layout).
 * Su localhost non viene caricato (Google 403). Inizializza la coda con useLayoutEffect
 * così è pronta prima degli useEffect degli slot laterali.
 */
export default function AdSenseScript() {
  const [loadScript, setLoadScript] = useState(false);

  useLayoutEffect(() => {
    if (typeof window === "undefined" || window.location.hostname === "localhost") return;
    const w = window as any;
    w.adsbygoogle = w.adsbygoogle || [];
    w.adsbygoogle.requestNonPersonalizedAds = 1;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || window.location.hostname === "localhost") return;
    let cancelled = false;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
    let idleId: number | null = null;

    const enableScript = () => {
      if (cancelled) return;
      setLoadScript(true);
      window.removeEventListener("pointerdown", onFirstInteraction);
      window.removeEventListener("keydown", onFirstInteraction);
      window.removeEventListener("scroll", onFirstInteraction);
      if (fallbackTimer) clearTimeout(fallbackTimer);
      if (idleId != null && "cancelIdleCallback" in window) {
        (window as Window & { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(idleId);
      }
    };

    const onFirstInteraction = () => {
      enableScript();
    };

    window.addEventListener("pointerdown", onFirstInteraction, { once: true, passive: true });
    window.addEventListener("keydown", onFirstInteraction, { once: true });
    window.addEventListener("scroll", onFirstInteraction, { once: true, passive: true });

    if ("requestIdleCallback" in window) {
      idleId = (
        window as Window & {
          requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number;
        }
      ).requestIdleCallback(enableScript, { timeout: 8000 });
    } else {
      fallbackTimer = setTimeout(enableScript, 5000);
    }

    return () => {
      cancelled = true;
      window.removeEventListener("pointerdown", onFirstInteraction);
      window.removeEventListener("keydown", onFirstInteraction);
      window.removeEventListener("scroll", onFirstInteraction);
      if (fallbackTimer) clearTimeout(fallbackTimer);
      if (idleId != null && "cancelIdleCallback" in window) {
        (window as Window & { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(idleId);
      }
    };
  }, []);

  if (!clientId || !loadScript) return null;
  return (
    <Script
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`}
      strategy="lazyOnload"
      crossOrigin="anonymous"
    />
  );
}
