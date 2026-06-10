"use client";

import { useEffect, useRef } from "react";
import Clarity from "@microsoft/clarity";

const projectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID?.trim();
const hasIubendaConfig =
  Boolean(process.env.NEXT_PUBLIC_IUBENDA_SITE_ID?.trim()) &&
  Boolean(process.env.NEXT_PUBLIC_IUBENDA_COOKIE_POLICY_ID?.trim());

/**
 * Fallback Clarity senza Iubenda (solo dev/local).
 * In produzione il consenso è gestito da ClarityConsentGate dentro IubendaProvider.
 */
export default function MicrosoftClarity() {
  const initialized = useRef(false);

  useEffect(() => {
    if (!projectId || hasIubendaConfig || typeof window === "undefined") return;
    let cancelled = false;

    const init = () => {
      if (cancelled || initialized.current) return;
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
      window.removeEventListener("pointerdown", onFirstInteraction);
      window.removeEventListener("keydown", onFirstInteraction);
      window.removeEventListener("scroll", onFirstInteraction);
    };

    const onFirstInteraction = () => init();

    window.addEventListener("pointerdown", onFirstInteraction, { once: true, passive: true });
    window.addEventListener("keydown", onFirstInteraction, { once: true });
    window.addEventListener("scroll", onFirstInteraction, { once: true, passive: true });

    return () => {
      cancelled = true;
      window.removeEventListener("pointerdown", onFirstInteraction);
      window.removeEventListener("keydown", onFirstInteraction);
      window.removeEventListener("scroll", onFirstInteraction);
    };
  }, []);

  return null;
}
