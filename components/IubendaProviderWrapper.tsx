"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  IubendaProvider,
  type IubendaCookieSolutionBannerConfigInterface,
} from "@mep-agency/next-iubenda";
import TrackingConsentGate from "@/components/TrackingConsentGate";
import {
  getSiteThemeFromDom,
  subscribeSiteThemeClass,
  type SiteTheme,
} from "@/lib/siteTheme";

const siteId = process.env.NEXT_PUBLIC_IUBENDA_SITE_ID?.trim();
const cookiePolicyId = process.env.NEXT_PUBLIC_IUBENDA_COOKIE_POLICY_ID?.trim();
const lang = process.env.NEXT_PUBLIC_IUBENDA_LANG?.trim() ?? "it";

const ACCENT = "#f5a623";
const ACCENT_CAPTION = "#111827";

function buildBannerConfig(
  theme: SiteTheme,
  siteIdNum: number,
  cookiePolicyIdNum: number,
): IubendaCookieSolutionBannerConfigInterface {
  const isDark = theme === "dark";
  const shell = isDark ? "#252525" : "#f3f4f6";
  const panelBg = isDark ? "#252525" : "#ffffff";
  const panelText = isDark ? "#ffffff" : "#111827";
  const secondaryBtn = isDark ? "#3a3a3a" : "#f3f4f6";
  const secondaryCaption = isDark ? "#ffffff" : "#111827";

  return {
    siteId: siteIdNum,
    cookiePolicyId: cookiePolicyIdNum,
    lang,
    enableGdpr: true,
    gdprAppliesGlobally: true,
    perPurposeConsent: true,
    floatingPreferencesButtonDisplay: "bottom-left",
    floatingPreferencesButtonColor: shell as `#${string}`,
    floatingPreferencesButtonCaptionColor: panelText as `#${string}`,
    banner: {
      position: "bottom",
      acceptButtonDisplay: true,
      customizeButtonDisplay: true,
      rejectButtonDisplay: true,
      listPurposes: true,
      showPurposesToggles: true,
      applyStyles: true,
      backgroundColor: panelBg as `#${string}`,
      textColor: panelText as `#${string}`,
      acceptButtonColor: ACCENT as `#${string}`,
      acceptButtonCaptionColor: ACCENT_CAPTION as `#${string}`,
      customizeButtonColor: secondaryBtn as `#${string}`,
      customizeButtonCaptionColor: secondaryCaption as `#${string}`,
      rejectButtonColor: secondaryBtn as `#${string}`,
      rejectButtonCaptionColor: secondaryCaption as `#${string}`,
    },
  };
}

/**
 * Wrapper che avvolge l'app con IubendaProvider (next-iubenda).
 * Se NEXT_PUBLIC_IUBENDA_SITE_ID o NEXT_PUBLIC_IUBENDA_COOKIE_POLICY_ID non sono impostati,
 * restituisce solo i children (nessun banner cookie).
 */
export default function IubendaProviderWrapper({}: Record<string, never>) {
  const siteIdNum = siteId ? Number(siteId) : NaN;
  const cookiePolicyIdNum = cookiePolicyId ? Number(cookiePolicyId) : NaN;
  const invalid =
    !siteId || !cookiePolicyId || Number.isNaN(siteIdNum) || Number.isNaN(cookiePolicyIdNum);

  const theme = useSyncExternalStore(subscribeSiteThemeClass, getSiteThemeFromDom, () => "dark");

  const bannerConfig = useMemo(
    () => buildBannerConfig(theme, siteIdNum, cookiePolicyIdNum),
    [theme, siteIdNum, cookiePolicyIdNum],
  );

  const [shouldLoadProvider, setShouldLoadProvider] = useState(false);

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

  if (invalid) return null;
  if (!shouldLoadProvider) return null;

  return (
    <IubendaProvider bannerConfig={bannerConfig} lang={lang}>
      <TrackingConsentGate />
    </IubendaProvider>
  );
}
