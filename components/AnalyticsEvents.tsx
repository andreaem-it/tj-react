"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * GA4 uses enhanced measurement for page views, including App Router history
 * changes. This component only records business interactions that GA4 cannot
 * infer reliably: Price Radar interactions and outbound affiliate clicks.
 */
export default function AnalyticsEvents() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest<HTMLAnchorElement>("a[href]");
      if (!link || !window.gtag) return;

      const path = new URL(link.href, window.location.href).pathname;
      if (/^\/price-radar\/[A-Z0-9]{10}$/i.test(path)) {
        window.gtag("event", "price_radar_view_item", {
          item_id: path.split("/").pop(),
        });
      }

      let url: URL;
      try {
        url = new URL(link.href, window.location.href);
      } catch {
        return;
      }
      if (!/(^|\.)amazon\.[a-z.]+$/i.test(url.hostname)) return;

      window.gtag("event", "price_radar_affiliate_click", {
        merchant: "amazon",
        item_id: url.pathname.match(/\/dp\/([A-Z0-9]{10})/i)?.[1],
      });
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
