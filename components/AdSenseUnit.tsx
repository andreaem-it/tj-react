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
}

const placeholderClassName =
  "rounded border border-dashed border-border bg-surface-overlay flex items-center justify-center text-muted text-xs";

/**
 * Unità pubblicitaria Google AdSense. Richiede che AdSenseScript sia caricato nel layout
 * e che NEXT_PUBLIC_ADSENSE_CLIENT_ID sia impostato. Su localhost mostra solo un placeholder
 * (Google risponde 403 per domini non verificati).
 */
export default function AdSenseUnit({
  adSlot,
  adFormat = "auto",
  fullWidthResponsive = true,
  style,
  className = "",
}: AdSenseUnitProps) {
  const insRef = useRef<HTMLModElement>(null);
  const pushedRef = useRef(false);
  const [useRealAd, setUseRealAd] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hostname !== "localhost") {
      setUseRealAd(true);
    }
  }, []);

  useEffect(() => {
    if (!useRealAd || !adSlot || pushedRef.current || !insRef.current) return;
    const push = () => {
      if (typeof window === "undefined" || !window.adsbygoogle || pushedRef.current) return;
      try {
        window.adsbygoogle.push({});
        pushedRef.current = true;
      } catch {
        // ignore
      }
    };
    push();
    if (!pushedRef.current) {
      const t = setTimeout(push, 500);
      return () => clearTimeout(t);
    }
  }, [adSlot, useRealAd]);

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
    <div className={className} style={style}>
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
