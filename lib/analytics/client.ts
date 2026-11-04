export type AnalyticsParams = Record<string, string | number | boolean | undefined>;

export function trackEvent(name: string, params: AnalyticsParams = {}): boolean {
  if (typeof window === "undefined") return false;
  if (!window.gtag) {
    window.dispatchEvent(new Event("techjournal:ga-needed"));
    return false;
  }
  window.gtag("event", name, params);
  return true;
}

