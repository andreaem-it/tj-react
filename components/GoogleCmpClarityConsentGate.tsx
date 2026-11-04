"use client";

import { useEffect, useRef, useState } from "react";
import Clarity from "@microsoft/clarity";
import { GOOGLE_CMP_CONSENT_UPDATED_EVENT } from "@/components/GoogleCmpConsentProvider";

const projectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID?.trim();

/** Collega Clarity al consenso analytics stabilito dalla CMP Google. */
export default function GoogleCmpClarityConsentGate() {
  const initialized = useRef(false);
  const [analyticsAllowed, setAnalyticsAllowed] = useState(
    () => typeof window !== "undefined" && Boolean(window.__techjournalGoogleConsent?.analytics),
  );

  useEffect(() => {
    const refresh = () => setAnalyticsAllowed(Boolean(window.__techjournalGoogleConsent?.analytics));
    window.addEventListener(GOOGLE_CMP_CONSENT_UPDATED_EVENT, refresh);
    refresh();
    return () => window.removeEventListener(GOOGLE_CMP_CONSENT_UPDATED_EVENT, refresh);
  }, []);

  useEffect(() => {
    if (!projectId || typeof window === "undefined") return;
    if (!analyticsAllowed) {
      if (initialized.current) Clarity.consentV2({ ad_Storage: "denied", analytics_Storage: "denied" });
      return;
    }
    if (initialized.current) {
      Clarity.consentV2({ ad_Storage: "denied", analytics_Storage: "granted" });
      return;
    }
    try {
      Clarity.init(projectId);
      Clarity.consentV2({ ad_Storage: "denied", analytics_Storage: "granted" });
      initialized.current = true;
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("[Clarity] init failed:", error);
    }
  }, [analyticsAllowed]);

  return null;
}
