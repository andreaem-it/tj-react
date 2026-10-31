"use client";

import { useEffect } from "react";
import { useIubenda } from "@mep-agency/next-iubenda";
import { gtagJsUrl } from "@/lib/thirdPartyScriptUrls";
import { consentPermissions, GOOGLE_ANALYTICS_READY_EVENT, syncGoogleAnalytics } from "@/lib/analytics/google";

const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
const SCRIPT_ID = "techjournal-ga";

export default function GoogleAnalytics() {
  const { userPreferences } = useIubenda();
  const { measurement, marketing } = consentPermissions(userPreferences);

  useEffect(() => {
    if (!measurementId) return;
    // Anche la revoca aggiorna tutti i segnali; measurement non concede marketing.
    syncGoogleAnalytics(window, measurementId, { measurement, marketing });
    if (!measurement) return;

    if (!document.getElementById(SCRIPT_ID)) {
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.async = true;
      script.src = gtagJsUrl(measurementId);
      document.head.appendChild(script);
    }
    // La coda è pronta anche se lo script di rete non è ancora arrivato.
    window.dispatchEvent(new Event(GOOGLE_ANALYTICS_READY_EVENT));
  }, [measurement, marketing]);

  return null;
}
