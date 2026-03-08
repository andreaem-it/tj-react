"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();

/**
 * Invia page_view a GA4 ai cambi di route (App Router).
 * Usare insieme a GoogleAnalytics nel layout.
 */
export default function GoogleAnalyticsPageView() {
  const pathname = usePathname();

  useEffect(() => {
    if (!measurementId || typeof window === "undefined" || !window.gtag) return;
    window.gtag("event", "page_view", {
      page_path: pathname ?? window.location.pathname,
      page_title: document.title,
    });
  }, [pathname]);

  return null;
}
