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
    setLoadScript(true);
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
