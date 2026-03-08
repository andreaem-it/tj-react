"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

/**
 * Carica lo script di Google AdSense una sola volta (usare in layout).
 * Su localhost lo script non viene caricato (Google risponde 403 per domini non verificati).
 */
export default function AdSenseScript() {
  const [loadScript, setLoadScript] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hostname !== "localhost") {
      setLoadScript(true);
    }
  }, []);

  if (!clientId?.trim() || !loadScript) return null;
  return (
    <Script
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`}
      strategy="afterInteractive"
      crossOrigin="anonymous"
    />
  );
}
