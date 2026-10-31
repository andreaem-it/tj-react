"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useIubenda } from "@mep-agency/next-iubenda";
import { consentPermissions, GOOGLE_ANALYTICS_READY_EVENT, pageTypeForPath, sendGooglePageView } from "@/lib/analytics/google";

const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();

export default function GoogleAnalyticsPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { userPreferences } = useIubenda();
  const { measurement } = consentPermissions(userPreferences);

  useEffect(() => {
    if (!measurementId || !measurement) return;
    const send = () => {
      const articleType = document.querySelector("[data-content-type]")?.getAttribute("data-content-type");
      sendGooglePageView(window, measurementId, {
        path: window.location.pathname + window.location.search,
        location: window.location.href,
        title: document.title,
        type: pageTypeForPath(window.location.pathname, articleType),
      });
    };
    window.addEventListener(GOOGLE_ANALYTICS_READY_EVENT, send);
    send();
    return () => window.removeEventListener(GOOGLE_ANALYTICS_READY_EVENT, send);
  }, [pathname, searchParams, measurement]);

  return null;
}
