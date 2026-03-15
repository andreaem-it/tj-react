"use client";

import { useEffect } from "react";
import { useIubenda } from "@mep-agency/next-iubenda";

/**
 * Integrazione next-iubenda con tracciamento:
 * - GA: __iubendaGaConsentUpdate quando l'utente accetta cookie "measurement".
 * - AdSense: aggiorna requestNonPersonalizedAds quando cambia il consenso marketing
 *   (lo script è caricato da AdSenseScript in layout).
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
    if (typeof window === "undefined" || !(window as any).adsbygoogle) return;
    (window as any).adsbygoogle.requestNonPersonalizedAds = allowMarketing ? 0 : 1;
  }, [allowMarketing]);

  return null;
}
