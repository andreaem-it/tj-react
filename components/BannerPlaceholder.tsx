"use client";

import AdSenseUnit from "./AdSenseUnit";

interface BannerPlaceholderProps {
  side: "left" | "right";
  /** Larghezza in px (es. 160 per skyscraper, 300 per medium rectangle) */
  width?: number;
  /** Altezza minima in px per l'area placeholder */
  minHeight?: number;
  /** Slot ID AdSense (es. da NEXT_PUBLIC_ADSENSE_SLOT_SKYSCRAPER_LEFT/RIGHT). Se non impostato, mostra placeholder. */
  adSlot?: string;
}

export default function BannerPlaceholder({
  side,
  width = 160,
  minHeight = 600,
  adSlot,
}: BannerPlaceholderProps) {
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

  const asideContent =
    clientId?.trim() && adSlot?.trim() ? (
      <AdSenseUnit
        adSlot={adSlot}
        adFormat="vertical"
        fullWidthResponsive={false}
        style={{ minHeight: `${Math.min(minHeight, 600)}px` }}
      />
    ) : (
      <div
        className="w-full rounded border border-dashed border-border bg-surface-overlay flex items-center justify-center text-muted text-xs"
        style={{ minHeight: `${Math.min(minHeight, 600)}px` }}
      >
        <span className="text-center px-2">
          {width}×{Math.min(minHeight, 600)}
          <br />
          Banner
        </span>
      </div>
    );

  return (
    <aside
      className="hidden xl:flex flex-col shrink-0 justify-start pt-6 sticky top-[120px]"
      style={{ width: `${width}px`, minHeight: `${minHeight}px` }}
      aria-label={`Banner pubblicitario ${side === "left" ? "sinistro" : "destro"}`}
    >
      {asideContent}
    </aside>
  );
}
