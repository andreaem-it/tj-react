"use client";

import { useEffect } from "react";
import Script from "next/script";
import { useIubenda } from "@mep-agency/next-iubenda";

const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID?.trim();

/**
 * Integrazione next-iubenda con script di tracciamento:
 * - Sincronizza il consenso iubenda con GA: quando l'utente accetta i cookie "measurement"
 *   viene chiamato __iubendaGaConsentUpdate (Consent Mode v2).
 * - AdSense: lo script viene caricato solo dopo consenso "marketing". Inizializziamo
 *   subito window.adsbygoogle così gli slot possono fare push() prima che lo script sia caricato.
 */
export default function TrackingConsentGate() {
  const { userPreferences } = useIubenda();
  const hasBeenLoaded = userPreferences?.hasBeenLoaded ?? false;
  const gdprPurposes = userPreferences?.gdprPurposes ?? {};
  const allowMeasurement = hasBeenLoaded && gdprPurposes.measurement;
  const allowMarketing = hasBeenLoaded && gdprPurposes.marketing;

  useEffect(() => {
    if (allowMeasurement && typeof window !== "undefined" && (window as any).__iubendaGaConsentUpdate) {
      (window as any).__iubendaGaConsentUpdate();
    }
  }, [allowMeasurement]);

  useEffect(() => {
    if (allowMarketing && typeof window !== "undefined") {
      (window as any).adsbygoogle = (window as any).adsbygoogle || [];
    }
  }, [allowMarketing]);

  return (
    <>
      {clientId?.trim() && allowMarketing && (
        <Script
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`}
          strategy="afterInteractive"
          crossOrigin="anonymous"
        />
      )}
    </>
  );
}
