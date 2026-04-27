"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import Script from "next/script";

const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID?.trim();
const ADSENSE_NEED_EVENT = "techjournal:adsense-needed";
const eagerAdSenseLoad = process.env.NEXT_PUBLIC_ADSENSE_EAGER_LOAD === "1";
const ADSENSE_FAILSAFE_MS = 3500;

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
    let failSafeTimer: ReturnType<typeof setTimeout> | null = null;
    const waitForUserInteraction = !eagerAdSenseLoad;

    const enableScript = () => {
      if (cancelled) return;
      setLoadScript(true);
      if (waitForUserInteraction) {
        window.removeEventListener("pointerdown", onFirstInteraction);
        window.removeEventListener("keydown", onFirstInteraction);
        window.removeEventListener("scroll", onFirstInteraction);
      }
      if (failSafeTimer) clearTimeout(failSafeTimer);
      window.removeEventListener(ADSENSE_NEED_EVENT, onAdSlotNeedsScript);
    };

    const onFirstInteraction = () => {
      enableScript();
    };
    const onAdSlotNeedsScript = () => {
      enableScript();
    };

    if (waitForUserInteraction) {
      window.addEventListener("pointerdown", onFirstInteraction, { once: true, passive: true });
      window.addEventListener("keydown", onFirstInteraction, { once: true });
      window.addEventListener("scroll", onFirstInteraction, { once: true, passive: true });
    }
    window.addEventListener(ADSENSE_NEED_EVENT, onAdSlotNeedsScript, { once: true });
    if (waitForUserInteraction) {
      // Failsafe revenue guard: se nessuno slot emette l'evento in tempi brevi,
      // carica comunque AdSense per evitare giornate senza impression.
      failSafeTimer = setTimeout(enableScript, ADSENSE_FAILSAFE_MS);
    } else {
      // Modalità eager: carica subito lo script per evitare slot vuoti.
      enableScript();
    }

    return () => {
      cancelled = true;
      if (waitForUserInteraction) {
        window.removeEventListener("pointerdown", onFirstInteraction);
        window.removeEventListener("keydown", onFirstInteraction);
        window.removeEventListener("scroll", onFirstInteraction);
      }
      if (failSafeTimer) clearTimeout(failSafeTimer);
      window.removeEventListener(ADSENSE_NEED_EVENT, onAdSlotNeedsScript);
    };
  }, []);

  if (!clientId || !loadScript) return null;
  return (
    <Script
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`}
      strategy="afterInteractive"
      crossOrigin="anonymous"
    />
  );
}
