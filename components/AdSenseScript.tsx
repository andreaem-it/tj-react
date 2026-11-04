"use client";

import { useEffect, useLayoutEffect } from "react";
import { useIubenda } from "@mep-agency/next-iubenda";
import { adsenseJsUrl } from "@/lib/thirdPartyScriptUrls";

const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID?.trim();
const ADSENSE_SCRIPT_ID = "techjournal-adsense";
const useGoogleCmp = process.env.NEXT_PUBLIC_CONSENT_PROVIDER === "google";

/**
 * Carica lo script di Google AdSense una sola volta (usare in layout).
 * Su localhost non viene caricato (Google 403). Inizializza la coda con useLayoutEffect
 * così è pronta prima degli useEffect degli slot laterali.
 */
function IubendaAdSenseScript() {
  const { userPreferences } = useIubenda();
  const consentReady = userPreferences?.hasBeenLoaded ?? false;
  const allowMarketing = consentReady && userPreferences.gdprPurposes.marketing;

  useLayoutEffect(() => {
    if (typeof window === "undefined" || window.location.hostname === "localhost") return;
    const w = window as Window & { adsbygoogle?: unknown[] & { requestNonPersonalizedAds?: number } };
    w.adsbygoogle = w.adsbygoogle || [];
    w.adsbygoogle.requestNonPersonalizedAds = allowMarketing ? 0 : 1;
  }, [allowMarketing]);

  useEffect(() => {
    if (
      !consentReady ||
      typeof window === "undefined" ||
      window.location.hostname === "localhost" ||
      !clientId ||
      document.getElementById(ADSENSE_SCRIPT_ID)
    ) {
      return;
    }

    const script = document.createElement("script");
    script.id = ADSENSE_SCRIPT_ID;
    script.async = true;
    script.src = adsenseJsUrl(clientId);
    if (!script.src.startsWith(window.location.origin)) {
      script.crossOrigin = "anonymous";
    }
    document.head.appendChild(script);
  }, [consentReady]);

  return null;
}

/**
 * Funding Choices viene distribuito dal tag AdSense: non deve aspettare una
 * scelta dell'utente, altrimenti la CMP non potrebbe mai comparire. Le scelte
 * TCF e Consent Mode sono applicate da Google prima della pubblicità.
 */
function GoogleCmpAdSenseScript() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      window.location.hostname === "localhost" ||
      !clientId ||
      document.getElementById(ADSENSE_SCRIPT_ID)
    ) {
      return;
    }

    const script = document.createElement("script");
    script.id = ADSENSE_SCRIPT_ID;
    script.async = true;
    script.src = adsenseJsUrl(clientId);
    if (!script.src.startsWith(window.location.origin)) script.crossOrigin = "anonymous";
    document.head.appendChild(script);
  }, []);

  return null;
}

export default function AdSenseScript() {
  return useGoogleCmp ? <GoogleCmpAdSenseScript /> : <IubendaAdSenseScript />;
}
