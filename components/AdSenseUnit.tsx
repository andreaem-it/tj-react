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
}

const placeholderClassName =
  "rounded border border-dashed border-border bg-surface-overlay flex items-center justify-center text-muted text-xs";
const ADSENSE_NEED_EVENT = "techjournal:adsense-needed";

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
}: AdSenseUnitProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const insRef = useRef<HTMLModElement>(null);
  const pushedRef = useRef(false);
  const requestedScriptRef = useRef(false);
  const [useRealAd, setUseRealAd] = useState(false);
  const [isVisible, setIsVisible] = useState(!deferUntilVisible);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hostname !== "localhost") {
      setUseRealAd(true);
    }
  }, []);

  useEffect(() => {
    if (!useRealAd || !deferUntilVisible || isVisible) return;
    const target = wrapperRef.current;
    if (!target) return;
    if (!("IntersectionObserver" in window)) {
      setIsVisible(true);
      return;
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
      const w = window as any;
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

  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  if (!clientId?.trim() || !adSlot?.trim()) return null;

  if (!useRealAd) {
    return (
      <div
        className={`${placeholderClassName} ${className}`.trim()}
        style={style}
        aria-label="Spazio pubblicitario (visibile in produzione)"
      >
        <span className="text-center px-2">Annuncio (solo in produzione)</span>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className={className} style={style}>
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={clientId}
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive={fullWidthResponsive ? "true" : "false"}
        aria-label="Pubblicità"
      />
    </div>
  );
}
