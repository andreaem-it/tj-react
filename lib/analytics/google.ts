export const GOOGLE_ANALYTICS_READY_EVENT = "techjournal:ga-ready";

export type ConsentPreferences = {
  hasBeenLoaded?: boolean;
  gdprPurposes?: { measurement?: boolean; marketing?: boolean };
} | null | undefined;

export function consentPermissions(preferences: ConsentPreferences) {
  return {
    measurement: preferences?.hasBeenLoaded === true && preferences.gdprPurposes?.measurement === true,
    marketing: preferences?.hasBeenLoaded === true && preferences.gdprPurposes?.marketing === true,
  };
}

export function googleConsent(permissions: { measurement: boolean; marketing: boolean }) {
  return {
    analytics_storage: permissions.measurement ? "granted" : "denied",
    ad_storage: permissions.marketing ? "granted" : "denied",
    ad_user_data: permissions.marketing ? "granted" : "denied",
    ad_personalization: permissions.marketing ? "granted" : "denied",
  } as const;
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    __tjGoogleAnalytics?: {
      measurement: boolean;
      configuredId?: string;
      lastPagePath?: string;
    };
  }
}

/** Configura la coda prima dello script, senza inviare page_view automatiche. */
export function syncGoogleAnalytics(
  target: Window,
  measurementId: string,
  permissions: { measurement: boolean; marketing: boolean },
) {
  if (!target.__tjGoogleAnalytics) {
    target.dataLayer = target.dataLayer || [];
    target.gtag = target.gtag || function () {
      // gtag richiede gli Arguments originali nella dataLayer.
      // eslint-disable-next-line prefer-rest-params -- formato della coda gtag ufficiale
      target.dataLayer!.push(arguments);
    };
    target.__tjGoogleAnalytics = { measurement: false };
    target.gtag("consent", "default", googleConsent({ measurement: false, marketing: false }));
    target.gtag("set", "ads_data_redaction", true);
  }

  const state = target.__tjGoogleAnalytics;
  state.measurement = permissions.measurement;
  target.gtag!("consent", "update", googleConsent(permissions));
  if (!permissions.measurement || state.configuredId === measurementId) return;

  target.gtag!("js", new Date());
  target.gtag!("config", measurementId, { send_page_view: false });
  state.configuredId = measurementId;
}

export function pageTypeForPath(path: string, articleType?: string | null): string {
  if (articleType) return articleType;
  if (path === "/") return "home";
  if (/^\/price-radar(?:\/|$)/.test(path)) return "price_radar";
  if (/^\/compatibility(?:\/|$)/.test(path)) return "compatibility";
  return "other";
}

/** Una sola page_view per percorso consecutivo; A → B → A conta tre visite. */
export function sendGooglePageView(
  target: Window,
  measurementId: string,
  page: { path: string; location: string; title: string; type: string },
): boolean {
  const state = target.__tjGoogleAnalytics;
  if (!state?.measurement || state.configuredId !== measurementId || !target.gtag) return false;
  if (state.lastPagePath === page.path) return false;
  target.gtag("event", "page_view", {
    send_to: measurementId,
    page_path: page.path,
    page_location: page.location,
    page_title: page.title,
    page_type: page.type,
  });
  state.lastPagePath = page.path;
  return true;
}
