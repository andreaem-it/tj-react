"use client";

import { useEffect, useLayoutEffect } from "react";
import Script from "next/script";
import { useIubenda } from "@mep-agency/next-iubenda";

const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID?.trim();

/**
 * Integrazione next-iubenda con script di tracciamento:
 * - GA: __iubendaGaConsentUpdate quando l'utente accetta cookie "measurement".
 * - AdSense: script caricato subito (così i banner laterali trovano la coda pronta).
 *   NPA in base al consenso; senza consenso = annunci non personalizzati (GDPR‑ok).
 */
export default function TrackingConsentGate() {
  const { userPreferences } = useIubenda();
  const hasBeenLoaded = userPreferences?.hasBeenLoaded ?? false;
  const gdprPurposes = userPreferences?.gdprPurposes ?? {};
  const allowMeasurement = hasBeenLoaded && gdprPurposes.measurement;
  const allowMarketing = hasBeenLoaded && gdprPurposes.marketing;
  const shouldLoadAdSense = Boolean(clientId?.trim());

  useEffect(() => {
    if (allowMeasurement && typeof window !== "undefined" && (window as any).__iubendaGaConsentUpdate) {
      (window as any).__iubendaGaConsentUpdate();
    }
  }, [allowMeasurement]);

  useLayoutEffect(() => {
    if (!shouldLoadAdSense || typeof window === "undefined") return;
    const w = window as any;
    w.adsbygoogle = w.adsbygoogle || [];
    w.adsbygoogle.requestNonPersonalizedAds = allowMarketing ? 0 : 1;
  }, [shouldLoadAdSense, allowMarketing]);

  return (
    <>
      {shouldLoadAdSense && (
        <Script
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`}
          strategy="afterInteractive"
          crossOrigin="anonymous"
        />
      )}
    </>
  );
}
