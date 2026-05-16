"use client";

import { useEffect } from "react";
import { useIubenda } from "@mep-agency/next-iubenda";

const GA_NEED_EVENT = "techjournal:ga-needed";

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
    if (!allowMeasurement || typeof window === "undefined") return;

    /**
     * GoogleAnalytics carica gli script solo dopo GA_NEED_EVENT. Con Iubenda,
     * __iubendaGaConsentUpdate viene definito nello stesso momento in cui gli
     * script si montano: se richiedessimo prima la callback, sarebbe un deadlock
     * e GA non riceverebbe mai dati.
     */
    window.dispatchEvent(new Event(GA_NEED_EVENT));

    let intervalId: ReturnType<typeof window.setInterval> | undefined;
    const tryGrant = (): boolean => {
      const grant = (window as any).__iubendaGaConsentUpdate as (() => void) | undefined;
      if (typeof grant !== "function") return false;
      grant();
      return true;
    };

    if (!tryGrant()) {
      intervalId = window.setInterval(() => {
        if (tryGrant() && intervalId != null) {
          window.clearInterval(intervalId);
          intervalId = undefined;
        }
      }, 50);
    }

    const stop = window.setTimeout(() => {
      if (intervalId != null) window.clearInterval(intervalId);
    }, 15_000);

    return () => {
      window.clearTimeout(stop);
      if (intervalId != null) window.clearInterval(intervalId);
    };
  }, [allowMeasurement]);

  useEffect(() => {
    if (typeof window === "undefined" || !(window as any).adsbygoogle) return;
    (window as any).adsbygoogle.requestNonPersonalizedAds = allowMarketing ? 0 : 1;
  }, [allowMarketing]);

  return null;
}
