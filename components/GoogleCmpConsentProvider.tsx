"use client";

import { ReactNode, useEffect, useRef } from "react";

const GA_NEED_EVENT = "techjournal:ga-needed";
const CONSENT_UPDATED_EVENT = "techjournal:google-consent-updated";

type ConsentModeValues = {
  adStoragePurposeConsentStatus?: number;
  adUserDataPurposeConsentStatus?: number;
  adPersonalizationPurposeConsentStatus?: number;
  analyticsStoragePurposeConsentStatus?: number;
};

type GoogleFc = {
  callbackQueue: Array<Record<string, () => void> | (() => void)>;
  showRevocationMessage?: () => void;
  ConsentModePurposeStatusEnum?: {
    CONSENT_MODE_PURPOSE_STATUS_GRANTED: number;
    CONSENT_MODE_PURPOSE_STATUS_NOT_APPLICABLE: number;
  };
  getGoogleConsentModeValues?: () => ConsentModeValues;
};

type TcfData = {
  tcString?: unknown;
  gdprApplies?: unknown;
  eventStatus?: unknown;
  cmpId?: unknown;
  cmpVersion?: unknown;
};

declare global {
  interface Window {
    googlefc?: GoogleFc;
    __tcfapi?: (
      command: "addEventListener",
      version: number,
      callback: (data: unknown, success: boolean) => void,
    ) => void;
    __techjournalGoogleConsent?: {
      ready: boolean;
      analytics: boolean;
      marketing: boolean;
    };
  }
}

function allowed(status: number | undefined, googlefc: GoogleFc): boolean {
  const values = googlefc.ConsentModePurposeStatusEnum;
  return status === values?.CONSENT_MODE_PURPOSE_STATUS_GRANTED ||
    status === values?.CONSENT_MODE_PURPOSE_STATUS_NOT_APPLICABLE;
}

/**
 * Adattatore per la CMP Google (AdSense Privacy & messaging). Funding Choices
 * aggiorna Consent Mode; qui esponiamo lo stesso stato ai tag non Google e agli
 * slot pubblicitari del sito. Non scegliere le finalità: quelle restano nella UI
 * certificata di AdSense.
 */
export default function GoogleCmpConsentProvider({ children }: { children: ReactNode }) {
  const lastSavedFingerprint = useRef<string | null>(null);
  const pendingFingerprint = useRef<string | null>(null);

  useEffect(() => {
    const googlefc = (window.googlefc = window.googlefc || { callbackQueue: [] });
    googlefc.callbackQueue = googlefc.callbackQueue || [];

    const publish = (tcfData: TcfData | null) => {
      const values = googlefc.getGoogleConsentModeValues?.();
      if (!values) return;

      const analytics = allowed(values.analyticsStoragePurposeConsentStatus, googlefc);
      const marketing = [
        values.adStoragePurposeConsentStatus,
        values.adUserDataPurposeConsentStatus,
        values.adPersonalizationPurposeConsentStatus,
      ].every((status) => allowed(status, googlefc));

      const policyVersion = process.env.NEXT_PUBLIC_CONSENT_POLICY_VERSION?.trim();
      const gdprApplies = typeof tcfData?.gdprApplies === "boolean" ? tcfData.gdprApplies : null;
      const tcfString = typeof tcfData?.tcString === "string" ? tcfData.tcString : null;
      // Per utenti soggetti a GDPR non consideriamo utilizzabile lo stato finché
      // la CMP non ha esposto il TC string da conservare nel registro server-side.
      // Attendiamo sempre il callback TCF: senza il suo esito non possiamo
      // dimostrare quale scelta sia stata effettivamente espressa dalla CMP.
      if (!policyVersion || !tcfData || (gdprApplies === true && !tcfString)) return;

      const payload = {
        policyVersion,
        tcfString,
        gdprApplies,
        eventStatus: typeof tcfData?.eventStatus === "string" ? tcfData.eventStatus : null,
        cmpId: typeof tcfData?.cmpId === "number" ? tcfData.cmpId : null,
        cmpVersion: typeof tcfData?.cmpVersion === "number" ? tcfData.cmpVersion : null,
        consent: { analytics, marketing },
      };
      const fingerprint = JSON.stringify(payload);
      if (lastSavedFingerprint.current === fingerprint || pendingFingerprint.current === fingerprint) return;
      pendingFingerprint.current = fingerprint;

      void fetch("/api/consent/receipts", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then((response) => {
        if (!response.ok) throw new Error(`Consent receipt failed: ${response.status}`);
        lastSavedFingerprint.current = fingerprint;
        window.__techjournalGoogleConsent = { ready: true, analytics, marketing };
        window.dispatchEvent(new CustomEvent(CONSENT_UPDATED_EVENT));
        if (analytics) window.dispatchEvent(new Event(GA_NEED_EVENT));
      }).catch((error: unknown) => {
        // Fail closed: senza ricevuta dimostrabile non abilitiamo i tag opzionali.
        if (process.env.NODE_ENV === "development") console.error("[consent] receipt not stored", error);
      }).finally(() => {
        if (pendingFingerprint.current === fingerprint) pendingFingerprint.current = null;
      });
    };

    // Consent Mode for Google tags, TCF per ricevere anche modifiche e revoche
    // effettuate dal link permanente nel footer.
    let latestTcfData: TcfData | null = null;
    googlefc.callbackQueue.push({ CONSENT_MODE_DATA_READY: () => publish(latestTcfData) });
    googlefc.callbackQueue.push({
      CONSENT_API_READY: () => {
        window.__tcfapi?.("addEventListener", 2.2, (data, success) => {
          if (!success || !data || typeof data !== "object") return;
          latestTcfData = data as TcfData;
          publish(latestTcfData);
        });
      },
    });
  }, []);

  return <>{children}</>;
}

export const GOOGLE_CMP_CONSENT_UPDATED_EVENT = CONSENT_UPDATED_EVENT;
