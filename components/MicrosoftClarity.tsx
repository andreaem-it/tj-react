"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { clarityTagUrl } from "@/lib/thirdPartyScriptUrls";

const projectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID?.trim();
const GA_NEED_EVENT = "techjournal:ga-needed";
const hasIubendaConfig =
  Boolean(process.env.NEXT_PUBLIC_IUBENDA_SITE_ID?.trim()) &&
  Boolean(process.env.NEXT_PUBLIC_IUBENDA_COOKIE_POLICY_ID?.trim());

/**
 * Microsoft Clarity (heatmap / session replay).
 * Imposta NEXT_PUBLIC_CLARITY_PROJECT_ID in .env.local (dashboard Clarity → Settings → Setup).
 * Con Iubenda carica solo dopo consenso "measurement" (stesso evento di GA).
 */
export default function MicrosoftClarity() {
  const [shouldLoad, setShouldLoad] = useState(false);
  const enabled = Boolean(projectId);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    let cancelled = false;

    const enable = () => {
      if (cancelled) return;
      setShouldLoad(true);
      window.removeEventListener("pointerdown", onFirstInteraction);
      window.removeEventListener("keydown", onFirstInteraction);
      window.removeEventListener("scroll", onFirstInteraction);
      window.removeEventListener(GA_NEED_EVENT, onMeasurementAllowed);
    };

    const onFirstInteraction = () => enable();
    const onMeasurementAllowed = () => enable();

    if (!hasIubendaConfig) {
      window.addEventListener("pointerdown", onFirstInteraction, { once: true, passive: true });
      window.addEventListener("keydown", onFirstInteraction, { once: true });
      window.addEventListener("scroll", onFirstInteraction, { once: true, passive: true });
    }
    window.addEventListener(GA_NEED_EVENT, onMeasurementAllowed, { once: true });

    return () => {
      cancelled = true;
      if (!hasIubendaConfig) {
        window.removeEventListener("pointerdown", onFirstInteraction);
        window.removeEventListener("keydown", onFirstInteraction);
        window.removeEventListener("scroll", onFirstInteraction);
      }
      window.removeEventListener(GA_NEED_EVENT, onMeasurementAllowed);
    };
  }, [enabled]);

  if (!projectId || !shouldLoad) return null;

  const tagUrl = clarityTagUrl(projectId);
  const clarityScript = `
    (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src=${JSON.stringify(tagUrl)};
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", ${JSON.stringify(projectId)});
  `;

  return (
    <Script id="microsoft-clarity" strategy="lazyOnload">
      {clarityScript}
    </Script>
  );
}
