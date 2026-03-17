"use client";

import { useIubenda } from "@mep-agency/next-iubenda";

interface PrivacyPolicyLinksProps {
  privacyUrl: string | null;
  cookieUrl: string | null;
}

/**
 * Link e pulsanti per Privacy e Cookie policy usando useIubenda() (next-iubenda).
 * showCookiePolicy apre il popup della cookie policy; openPreferences apre il pannello preferenze.
 * Se il provider non è montato (env assenti), mostra solo i link esterni.
 */
export default function PrivacyPolicyLinks({ privacyUrl, cookieUrl }: PrivacyPolicyLinksProps) {
  const iubenda = useIubenda();
  const hasProvider =
    typeof iubenda?.showCookiePolicy === "function" &&
    typeof iubenda?.openPreferences === "function";

  return (
    <div className="space-y-6 text-muted">
      {privacyUrl && (
        <p>
          Informativa sulla privacy:{" "}
          <a href={privacyUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
            Visualizza su iubenda
          </a>
          {" · "}
          <a href={privacyUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline text-sm">
            Apri in nuova scheda
          </a>
        </p>
      )}
      {cookieUrl && (
        <p>
          Cookie policy e preferenze (gestite da iubenda):{" "}
          {hasProvider ? (
            <>
              <button
                type="button"
                onClick={() => iubenda.showCookiePolicy()}
                className="text-accent hover:underline bg-transparent border-none cursor-pointer p-0 font-inherit"
              >
                Visualizza cookie policy
              </button>
              {" · "}
              <button
                type="button"
                onClick={() => iubenda.openPreferences()}
                className="text-accent hover:underline bg-transparent border-none cursor-pointer p-0 font-inherit"
              >
                Modifica preferenze cookie
              </button>
              {" · "}
            </>
          ) : null}
          <a href={cookieUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline text-sm">
            Apri in nuova scheda
          </a>
        </p>
      )}
    </div>
  );
}
