"use client";

import { useEffect, useRef } from "react";
import { useIubenda } from "@mep-agency/next-iubenda";
import Clarity from "@microsoft/clarity";
import { consentPermissions } from "@/lib/analytics/google";

const projectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID?.trim();

/**
 * Inizializza Microsoft Clarity quando Iubenda segnala consenso "measurement".
 * Vive dentro IubendaProvider: niente eventi custom né import dinamici (più affidabile su mobile/web).
 */
export default function ClarityConsentGate() {
  const { userPreferences } = useIubenda();
  const initialized = useRef(false);

  const { measurement, marketing } = consentPermissions(userPreferences);

  useEffect(() => {
    if (!projectId || (!measurement && !initialized.current)) return;

    try {
      if (!initialized.current) {
        Clarity.init(projectId);
        initialized.current = true;
      }
      Clarity.consentV2({
        ad_Storage: marketing ? "granted" : "denied",
        analytics_Storage: measurement ? "granted" : "denied",
      });
    } catch (error) {
      initialized.current = false;
      if (process.env.NODE_ENV === "development") {
        console.error("[Clarity] init failed:", error);
      }
    }
  }, [measurement, marketing]);

  return null;
}
