"use client";

import { ReactNode } from "react";
import { useIubenda } from "@mep-agency/next-iubenda";

const SKYSCRAPER_WIDTH = 160;
const SKYSCRAPER_MIN_HEIGHT = 600;

function AdConsentPlaceholder({
  width = SKYSCRAPER_WIDTH,
  minHeight = SKYSCRAPER_MIN_HEIGHT,
}: {
  width?: number;
  minHeight?: number;
}) {
  return (
    <aside
      className="hidden xl:flex flex-col shrink-0 justify-start pt-6 sticky top-[120px]"
      style={{ width: `${width}px`, minHeight: `${minHeight}px` }}
      aria-hidden
    >
      <div
        className="w-full rounded border border-border bg-content-bg flex items-center justify-center text-muted text-[10px]"
        style={{ minHeight: `${minHeight}px` }}
      >
        <span className="opacity-50">Annunci</span>
      </div>
    </aside>
  );
}

interface ConsentAwareAdSlotProps {
  children: ReactNode;
  /** Larghezza dello slot (deve coincidere con BannerPlaceholder per non rompere il layout) */
  width?: number;
  /** Altezza minima (idem) */
  minHeight?: number;
}

/**
 * Mostra i blocchi pubblicitari (AdSense) solo se l'utente ha accettato i cookie "marketing".
 * Usa useIubenda() come TrackingConsentGate così script e slot sono allineati.
 */
export default function ConsentAwareAdSlot({
  children,
  width = SKYSCRAPER_WIDTH,
  minHeight = SKYSCRAPER_MIN_HEIGHT,
}: ConsentAwareAdSlotProps) {
  const { userPreferences } = useIubenda();
  const hasProvider = userPreferences != null;
  const hasConsent =
    !hasProvider ||
    (userPreferences.hasBeenLoaded && userPreferences.gdprPurposes.marketing === true);

  if (hasConsent) {
    return <>{children}</>;
  }

  return <AdConsentPlaceholder width={width} minHeight={minHeight} />;
}
