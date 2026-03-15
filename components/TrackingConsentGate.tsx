"use client";

import { useEffect } from "react";
import Script from "next/script";
import { useIubenda } from "@mep-agency/next-iubenda";

const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID?.trim();

/**
 * Integrazione next-iubenda con script di tracciamento:
 * - GA: __iubendaGaConsentUpdate quando l'utente accetta cookie "measurement".
 * - AdSense: lo script viene caricato per tutti. Senza consenso marketing = annunci
 *   non personalizzati (NPA, GDPR‑ok). Con consenso = annunci personalizzati.
 */
export default function TrackingConsentGate() {
  const { userPreferences } = useIubenda();
  const hasBeenLoaded = userPreferences?.hasBeenLoaded ?? false;
  const gdprPurposes = userPreferences?.gdprPurposes ?? {};
  const allowMeasurement = hasBeenLoaded && gdprPurposes.measurement;
  const allowMarketing = hasBeenLoaded && gdprPurposes.marketing;
  const hasProvider = userPreferences != null;
  const shouldLoadAdSense = clientId?.trim() && (hasBeenLoaded || !hasProvider);

  useEffect(() => {
    if (allowMeasurement && typeof window !== "undefined" && (window as any).__iubendaGaConsentUpdate) {
      (window as any).__iubendaGaConsentUpdate();
    }
  }, [allowMeasurement]);

  useEffect(() => {
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
