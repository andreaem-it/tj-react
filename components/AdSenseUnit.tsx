"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

export interface AdSenseUnitProps {
  /** Slot ID dell’unità pubblicitaria (da pannello AdSense) */
  adSlot: string;
  /** Formato: auto | rectangle | horizontal | vertical */
  adFormat?: "auto" | "rectangle" | "horizontal" | "vertical";
  /** Layout responsive (consigliato per inline) */
  fullWidthResponsive?: boolean;
  /** Stile del container (es. minHeight per evitare layout shift) */
  style?: React.CSSProperties;
  className?: string;
  /** Se true, inizializza l'ad solo quando entra in viewport. */
  deferUntilVisible?: boolean;
  /** Margine observer viewport (es. "300px") */
  rootMargin?: string;
  /** Posizione editoriale usata nei report GA4 (es. sidebar_left, article_inline). */
  adPosition?: string;
}

const placeholderClassName =
  "rounded border border-dashed border-border bg-surface-overlay flex items-center justify-center text-muted text-xs";
const ADSENSE_NEED_EVENT = "techjournal:adsense-needed";
const GA_NEED_EVENT = "techjournal:ga-needed";

function sendAdEvent(
  eventName: "ad_banner_loaded" | "ad_banner_view" | "ad_banner_unfilled",
  params: Record<string, string>,
): boolean {
  if (typeof window === "undefined") return false;
  if (!window.gtag) {
    window.dispatchEvent(new Event(GA_NEED_EVENT));
    return false;
  }
  window.gtag("event", eventName, params);
  return true;
}

/**
 * Unità pubblicitaria Google AdSense. Richiede che AdSenseScript sia caricato nel layout
 * e che NEXT_PUBLIC_ADSENSE_CLIENT_ID sia impostato. Su localhost mostra solo un placeholder
 * NPA gestito da AdSenseScript + TrackingConsentGate.
 */
export default function AdSenseUnit({
  adSlot,
  adFormat = "auto",
  fullWidthResponsive = true,
  style,
  className = "",
  deferUntilVisible = true,
  rootMargin = "300px",
  adPosition = "unspecified",
}: AdSenseUnitProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const insRef = useRef<HTMLModElement>(null);
  const pushedRef = useRef(false);
  const fillStatusRef = useRef<"filled" | "unfilled" | null>(null);
  const viewSentRef = useRef(false);
  const requestedScriptRef = useRef(false);
  const [useRealAd, setUseRealAd] = useState(false);
  const [isVisible, setIsVisible] = useState(!deferUntilVisible);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hostname !== "localhost") {
      const timer = window.setTimeout(() => setUseRealAd(true), 0);
      return () => window.clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (!useRealAd || !deferUntilVisible || isVisible) return;
    const target = wrapperRef.current;
    if (!target) return;
    if (!("IntersectionObserver" in window)) {
      const timer = globalThis.setTimeout(() => setIsVisible(true), 0);
      return () => globalThis.clearTimeout(timer);
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [useRealAd, deferUntilVisible, isVisible, rootMargin]);

  useEffect(() => {
    if (!useRealAd || !isVisible || !adSlot || !insRef.current) return;
    const requestScriptLoad = () => {
      if (typeof window === "undefined" || requestedScriptRef.current) return;
      requestedScriptRef.current = true;
      window.dispatchEvent(new Event(ADSENSE_NEED_EVENT));
    };
    const push = (): boolean => {
      if (typeof window === "undefined" || pushedRef.current) return false;
      const w = window as Window & { adsbygoogle?: unknown[] };
      if (!w.adsbygoogle) {
        requestScriptLoad();
        return false;
      }
      try {
        w.adsbygoogle.push({});
        pushedRef.current = true;
        return true;
      } catch {
        return false;
      }
    };
    // Richiede subito il caricamento dello script non appena lo slot entra in gioco.
    requestScriptLoad();
    if (push()) return;
    let attempts = 0;
    const maxAttempts = 75;
    const interval = setInterval(() => {
      if (pushedRef.current || attempts >= maxAttempts) {
        clearInterval(interval);
        return;
      }
      attempts += 1;
      if (push()) clearInterval(interval);
    }, 300);
    return () => clearInterval(interval);
  }, [adSlot, useRealAd, isVisible]);

  useEffect(() => {
    if (!useRealAd || !isVisible || !insRef.current) return;
    const adElement = insRef.current;
    const eventParams = {
      ad_slot: adSlot,
      ad_format: adFormat,
      ad_position: adPosition,
      consent_marketing: "granted",
    };
    let viewTimer: ReturnType<typeof setTimeout> | null = null;
    let analyticsRetry: ReturnType<typeof setInterval> | null = null;

    const emitWithRetry = (
      eventName: "ad_banner_loaded" | "ad_banner_view" | "ad_banner_unfilled",
    ) => {
      if (sendAdEvent(eventName, eventParams) || analyticsRetry) return;
      let attempts = 0;
      analyticsRetry = setInterval(() => {
        attempts += 1;
        if (sendAdEvent(eventName, eventParams) || attempts >= 20) {
          if (analyticsRetry) clearInterval(analyticsRetry);
          analyticsRetry = null;
        }
      }, 250);
    };

    const readFillStatus = () => {
      const status = adElement.getAttribute("data-ad-status");
      if (status !== "filled" && status !== "unfilled") return;
      if (fillStatusRef.current === status) return;
      fillStatusRef.current = status;
      emitWithRetry(status === "filled" ? "ad_banner_loaded" : "ad_banner_unfilled");
    };

    const mutationObserver = new MutationObserver(readFillStatus);
    mutationObserver.observe(adElement, {
      attributes: true,
      attributeFilter: ["data-ad-status"],
    });
    readFillStatus();

    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        const isViewable =
          entry?.isIntersecting && entry.intersectionRatio >= 0.5 && fillStatusRef.current === "filled";
        if (!isViewable) {
          if (viewTimer) clearTimeout(viewTimer);
          viewTimer = null;
          return;
        }
        if (viewSentRef.current || viewTimer) return;
        viewTimer = setTimeout(() => {
          viewTimer = null;
          if (viewSentRef.current || fillStatusRef.current !== "filled") return;
          viewSentRef.current = true;
          emitWithRetry("ad_banner_view");
          visibilityObserver.disconnect();
        }, 1000);
      },
      { threshold: [0, 0.5, 1] },
    );
    visibilityObserver.observe(adElement);

    return () => {
      mutationObserver.disconnect();
      visibilityObserver.disconnect();
      if (viewTimer) clearTimeout(viewTimer);
      if (analyticsRetry) clearInterval(analyticsRetry);
    };
  }, [adFormat, adPosition, adSlot, isVisible, useRealAd]);

  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  if (!clientId?.trim() || !adSlot?.trim()) return null;

  if (!useRealAd) {
    return (
      <div
        className={`${placeholderClassName} ${className}`.trim()}
        style={style}
        aria-label="Spazio pubblicitario (visibile in produzione)"
      >
        <span className="text-center px-2">Pubblicità</span>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className={className} style={style}>
      <span className="mb-1 block text-center text-[10px] uppercase tracking-wide text-muted">
        Pubblicità
      </span>
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={clientId}
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive={fullWidthResponsive ? "true" : "false"}
      />
    </div>
  );
}
