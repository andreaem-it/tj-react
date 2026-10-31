"use client";

import type { CSSProperties, ReactNode } from "react";
import { useIubenda } from "@mep-agency/next-iubenda";
import { consentPermissions } from "@/lib/analytics/google";

/** Stessa geometria dello slot, senza inizializzare annunci prima del consenso. */
export default function ConsentAwareAdSlot({
  children,
  style,
  className,
}: {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}) {
  const { userPreferences } = useIubenda();
  const { marketing } = consentPermissions(userPreferences);
  if (marketing) return <>{children}</>;

  return (
    <div style={style} className={className} aria-hidden="true">
      <span className="mb-1 block text-center text-[10px] uppercase tracking-wide text-muted">
        Pubblicità
      </span>
    </div>
  );
}
