"use client";

import { useEffect, useRef } from "react";
import { useIubenda } from "@mep-agency/next-iubenda";
import Clarity from "@microsoft/clarity";

const projectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID?.trim();

/**
 * Inizializza Microsoft Clarity quando Iubenda segnala consenso "measurement".
 * Vive dentro IubendaProvider: niente eventi custom né import dinamici (più affidabile su mobile/web).
 */
export default function ClarityConsentGate() {
  const { userPreferences } = useIubenda();
  const initialized = useRef(false);

  const hasBeenLoaded = userPreferences?.hasBeenLoaded ?? false;
  const allowMeasurement = Boolean(userPreferences?.gdprPurposes?.measurement);

  useEffect(() => {
    if (!projectId || !hasBeenLoaded || !allowMeasurement || initialized.current) return;
    initialized.current = true;

    try {
      Clarity.init(projectId);
      Clarity.consentV2({ ad_Storage: "granted", analytics_Storage: "granted" });
    } catch (error) {
      initialized.current = false;
      if (process.env.NODE_ENV === "development") {
        console.error("[Clarity] init failed:", error);
      }
    }
  }, [hasBeenLoaded, allowMeasurement]);

  return null;
}
