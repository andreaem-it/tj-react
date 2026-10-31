"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import ConsentAwareAdSlot from "./ConsentAwareAdSlot";
import { ADSENSE_READY_EVENT } from "./AdSenseScript";

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

/**
 * Unità pubblicitaria Google AdSense. Richiede che AdSenseScript sia caricato nel layout
 * e che NEXT_PUBLIC_ADSENSE_CLIENT_ID sia impostato. Su localhost mostra solo un placeholder
 * Consenso gestito da ConsentAwareAdSlot e AdSenseScript.
 */
export default function AdSenseUnit(props: AdSenseUnitProps) {
  const pathname = usePathname();
  return (
    <ConsentAwareAdSlot style={props.style} className={props.className}>
      <MountedAdSenseUnit key={`${pathname}:${props.adSlot}`} {...props} />
    </ConsentAwareAdSlot>
  );
}

function MountedAdSenseUnit({
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
    const push = (): boolean => {
      if (typeof window === "undefined" || pushedRef.current) return false;
      // Non accodare richieste per nodi che una navigazione potrebbe smontare
      // prima dell'arrivo dello script Google.
      if (!window.__tjAdSenseReady) return false;
      const ins = insRef.current;
      // Gli slot desktop esistono anche su mobile, ma non hanno larghezza.
      if (!ins || ins.getBoundingClientRect().width === 0) return false;
      if (ins.hasAttribute("data-adsbygoogle-status")) {
        pushedRef.current = true;
        return true;
      }
      const w = window as Window & { adsbygoogle?: unknown[] };
      if (!w.adsbygoogle) return false;
      try {
        w.adsbygoogle.push({});
        pushedRef.current = true;
        return true;
      } catch (error) {
        if (process.env.NODE_ENV === "development") console.warn("[AdSense] slot initialization failed", error);
        return false;
      }
    };
    if (push()) return;
    const onReady = () => { push(); };
    window.addEventListener(ADSENSE_READY_EVENT, onReady);
    // Uno slot nascosto su mobile può diventare visibile molto dopo il mount.
    // ResizeObserver resta attivo anche dopo la finestra dei retry di rete.
    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => {
      if (push()) resizeObserver?.disconnect();
    });
    resizeObserver?.observe(insRef.current);
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
    return () => {
      clearInterval(interval);
      window.removeEventListener(ADSENSE_READY_EVENT, onReady);
      resizeObserver?.disconnect();
    };
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
        aria-label="Pubblicità"
      />
    </div>
  );
}
