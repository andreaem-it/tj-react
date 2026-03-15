"use client";

import {
  IubendaProvider,
  type IubendaCookieSolutionBannerConfigInterface,
} from "@mep-agency/next-iubenda";

const siteId = process.env.NEXT_PUBLIC_IUBENDA_SITE_ID?.trim();
const cookiePolicyId = process.env.NEXT_PUBLIC_IUBENDA_COOKIE_POLICY_ID?.trim();
const lang = process.env.NEXT_PUBLIC_IUBENDA_LANG?.trim() ?? "it";

/**
 * Wrapper che avvolge l'app con IubendaProvider (next-iubenda).
 * Se NEXT_PUBLIC_IUBENDA_SITE_ID o NEXT_PUBLIC_IUBENDA_COOKIE_POLICY_ID non sono impostati,
 * restituisce solo i children (nessun banner cookie).
 */
export default function IubendaProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const siteIdNum = siteId ? Number(siteId) : NaN;
  const cookiePolicyIdNum = cookiePolicyId ? Number(cookiePolicyId) : NaN;

  if (!siteId || !cookiePolicyId || Number.isNaN(siteIdNum) || Number.isNaN(cookiePolicyIdNum)) {
    return <>{children}</>;
  }

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
      {children}
    </IubendaProvider>
  );
}
