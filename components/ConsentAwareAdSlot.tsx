"use client";

import { ReactNode } from "react";
import { ConsentAwareWrapper, useIubenda } from "@mep-agency/next-iubenda";

function AdConsentPlaceholder() {
  const iubenda = useIubenda();
  const openPreferences = typeof iubenda?.openPreferences === "function" ? iubenda.openPreferences : null;
  return (
    <div
      className="w-full rounded border border-border bg-surface-overlay flex flex-col items-center justify-center text-muted text-xs p-4 gap-2"
      style={{ minHeight: "200px" }}
    >
      <span className="text-center">Per visualizzare gli annunci accetta i cookie marketing.</span>
      {openPreferences && (
        <button type="button" onClick={() => openPreferences()} className="text-accent hover:underline text-sm">
          Apri preferenze
        </button>
      )}
    </div>
  );
}

interface ConsentAwareAdSlotProps {
  children: ReactNode;
}

/**
 * Mostra i blocchi pubblicitari (AdSense) solo se l'utente ha accettato i cookie "marketing".
 * Altrimenti mostra messaggio + pulsante per aprire le preferenze (next-iubenda).
 */
export default function ConsentAwareAdSlot({ children }: ConsentAwareAdSlotProps) {
  return (
    <ConsentAwareWrapper
      requiredGdprPurposes={["marketing"]}
      useDefaultStyles={false}
      customConsentNotGrantedNodes={<AdConsentPlaceholder />}
    >
      {children}
    </ConsentAwareWrapper>
  );
}
