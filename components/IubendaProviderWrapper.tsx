"use client";

import { useEffect, useState } from "react";
import {
  IubendaProvider,
  type IubendaCookieSolutionBannerConfigInterface,
} from "@mep-agency/next-iubenda";
import TrackingConsentGate from "@/components/TrackingConsentGate";

const siteId = process.env.NEXT_PUBLIC_IUBENDA_SITE_ID?.trim();
const cookiePolicyId = process.env.NEXT_PUBLIC_IUBENDA_COOKIE_POLICY_ID?.trim();
const lang = process.env.NEXT_PUBLIC_IUBENDA_LANG?.trim() ?? "it";

/**
 * Wrapper che avvolge l'app con IubendaProvider (next-iubenda).
 * Se NEXT_PUBLIC_IUBENDA_SITE_ID o NEXT_PUBLIC_IUBENDA_COOKIE_POLICY_ID non sono impostati,
 * restituisce solo i children (nessun banner cookie).
 */
export default function IubendaProviderWrapper({
}: Record<string, never>) {
  const siteIdNum = siteId ? Number(siteId) : NaN;
  const cookiePolicyIdNum = cookiePolicyId ? Number(cookiePolicyId) : NaN;
  const [shouldLoadProvider, setShouldLoadProvider] = useState(false);

  if (!siteId || !cookiePolicyId || Number.isNaN(siteIdNum) || Number.isNaN(cookiePolicyIdNum)) {
    return null;
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    let idleId: number | null = null;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

    const enable = () => {
      if (cancelled) return;
      setShouldLoadProvider(true);
      window.removeEventListener("pointerdown", onFirstInteraction);
      window.removeEventListener("keydown", onFirstInteraction);
      window.removeEventListener("scroll", onFirstInteraction);
    };

    const onFirstInteraction = () => enable();

    window.addEventListener("pointerdown", onFirstInteraction, { once: true, passive: true });
    window.addEventListener("keydown", onFirstInteraction, { once: true });
    window.addEventListener("scroll", onFirstInteraction, { once: true, passive: true });

    if ("requestIdleCallback" in window) {
      idleId = (
        window as Window & {
          requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number;
        }
      ).requestIdleCallback(enable, { timeout: 9000 });
    } else {
      fallbackTimer = setTimeout(enable, 5000);
    }

    return () => {
      cancelled = true;
      window.removeEventListener("pointerdown", onFirstInteraction);
      window.removeEventListener("keydown", onFirstInteraction);
      window.removeEventListener("scroll", onFirstInteraction);
      if (idleId != null && "cancelIdleCallback" in window) {
        (window as Window & { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(idleId);
      }
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, []);

  if (!shouldLoadProvider) return null;

  const bannerConfig: IubendaCookieSolutionBannerConfigInterface = {
    siteId: siteIdNum,
    cookiePolicyId: cookiePolicyIdNum,
    lang,
    enableGdpr: true,
    gdprAppliesGlobally: true,
    perPurposeConsent: true,
    floatingPreferencesButtonDisplay: "bottom-right",
    banner: {
      position: "bottom",
      acceptButtonDisplay: true,
      customizeButtonDisplay: true,
      rejectButtonDisplay: true,
      listPurposes: true,
      showPurposesToggles: true,
    },
  };

  return (
    <IubendaProvider bannerConfig={bannerConfig} lang={lang}>
      <TrackingConsentGate />
    </IubendaProvider>
  );
}
