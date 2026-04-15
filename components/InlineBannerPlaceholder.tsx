"use client";

import AdSenseUnit from "./AdSenseUnit";

interface InlineBannerPlaceholderProps {
  /** Larghezza (px o "100%" per full width) */
  width?: number | "100%";
  /** Altezza in px */
  height?: number;
  className?: string;
  /** Slot ID AdSense (es. da NEXT_PUBLIC_ADSENSE_SLOT_*). Se non impostato, mostra placeholder. */
  adSlot?: string;
}

export default function InlineBannerPlaceholder({
  width = "100%",
  height = 90,
  className = "",
  adSlot,
}: InlineBannerPlaceholderProps) {
  const widthStyle = width === "100%" ? "100%" : `${width}px`;
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

  if (clientId?.trim() && adSlot?.trim()) {
    return (
      <AdSenseUnit
        adSlot={adSlot}
        adFormat="auto"
        fullWidthResponsive
        deferUntilVisible
        rootMargin="250px"
        className={`shrink-0 ${className}`}
        style={{ width: widthStyle, minHeight: `${height}px` }}
      />
    );
  }

  return (
    <div
      className={`rounded border border-dashed border-border bg-surface-overlay flex items-center justify-center text-muted text-xs shrink-0 ${className}`}
      style={{ width: widthStyle, height: `${height}px` }}
      aria-label="Banner pubblicitario"
    >
      <span className="text-center px-2">
        {width === "100%" ? `${height}px · Banner` : `${width}×${height}`}
      </span>
    </div>
  );
}
