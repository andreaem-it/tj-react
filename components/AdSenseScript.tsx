"use client";

import { useEffect } from "react";
import { useIubenda } from "@mep-agency/next-iubenda";
import { consentPermissions } from "@/lib/analytics/google";
import { adsenseJsUrl } from "@/lib/thirdPartyScriptUrls";

const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID?.trim();
const ADSENSE_SCRIPT_ID = "techjournal-adsense";
export const ADSENSE_READY_EVENT = "techjournal:adsense-ready";

declare global {
  interface Window {
    __tjAdSenseReady?: boolean;
  }
}

/** Il caricamento è autorizzato dal consenso, mai da timer o interazioni. */
export default function AdSenseScript() {
  const { userPreferences } = useIubenda();
  const { marketing } = consentPermissions(userPreferences);

  useEffect(() => {
    if (!clientId || !marketing || window.location.hostname === "localhost") return;
    const ads = window.adsbygoogle = window.adsbygoogle || [];
    (ads as unknown[] & { requestNonPersonalizedAds?: number }).requestNonPersonalizedAds = 0;
    if (document.getElementById(ADSENSE_SCRIPT_ID)) return;

    const script = document.createElement("script");
    script.id = ADSENSE_SCRIPT_ID;
    script.async = true;
    script.src = adsenseJsUrl(clientId);
    script.onload = () => {
      window.__tjAdSenseReady = true;
      window.dispatchEvent(new Event(ADSENSE_READY_EVENT));
    };
    script.onerror = () => script.remove();
    if (!script.src.startsWith(window.location.origin)) script.crossOrigin = "anonymous";
    document.head.appendChild(script);
  }, [marketing]);

  useEffect(() => {
    if (marketing || !window.adsbygoogle) return;
    (window.adsbygoogle as unknown[] & { requestNonPersonalizedAds?: number }).requestNonPersonalizedAds = 1;
  }, [marketing]);

  return null;
}
