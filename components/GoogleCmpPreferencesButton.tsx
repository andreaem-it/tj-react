"use client";

const useGoogleCmp = process.env.NEXT_PUBLIC_CONSENT_PROVIDER === "google";

/** Link di revoca ufficiale di Privacy & messaging, visibile nel footer. */
export default function GoogleCmpPreferencesButton() {
  if (!useGoogleCmp) return null;

  return (
    <button
      type="button"
      onClick={() => {
        const googlefc = window.googlefc;
        if (!googlefc?.showRevocationMessage) return;
        googlefc.callbackQueue.push(() => googlefc.showRevocationMessage?.());
      }}
      className="inline-flex min-h-11 items-center text-muted hover:text-accent transition-colors text-sm"
    >
      Impostazioni privacy e cookie
    </button>
  );
}
