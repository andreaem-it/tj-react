"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import Script from "next/script";

const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID?.trim();
const ADSENSE_NEED_EVENT = "techjournal:adsense-needed";
const eagerAdSenseLoad = process.env.NEXT_PUBLIC_ADSENSE_EAGER_LOAD === "1";

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

    const enableScript = () => {
      if (cancelled) return;
      setLoadScript(true);
      if (eagerAdSenseLoad) {
        window.removeEventListener("pointerdown", onFirstInteraction);
        window.removeEventListener("keydown", onFirstInteraction);
        window.removeEventListener("scroll", onFirstInteraction);
      }
      window.removeEventListener(ADSENSE_NEED_EVENT, onAdSlotNeedsScript);
    };

    const onFirstInteraction = () => {
      enableScript();
    };
    const onAdSlotNeedsScript = () => {
      enableScript();
    };

    if (eagerAdSenseLoad) {
      window.addEventListener("pointerdown", onFirstInteraction, { once: true, passive: true });
      window.addEventListener("keydown", onFirstInteraction, { once: true });
      window.addEventListener("scroll", onFirstInteraction, { once: true, passive: true });
    }
    window.addEventListener(ADSENSE_NEED_EVENT, onAdSlotNeedsScript, { once: true });

    return () => {
      cancelled = true;
      if (eagerAdSenseLoad) {
        window.removeEventListener("pointerdown", onFirstInteraction);
        window.removeEventListener("keydown", onFirstInteraction);
        window.removeEventListener("scroll", onFirstInteraction);
      }
      window.removeEventListener(ADSENSE_NEED_EVENT, onAdSlotNeedsScript);
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
