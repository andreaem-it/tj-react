"use client";

import { useEffect, useState } from "react";
import { useIubenda } from "@mep-agency/next-iubenda";

interface IubendaPolicyContentProps {
  /** ID policy (es. NEXT_PUBLIC_IUBENDA_SITE_ID) */
  policyId: string;
  /** "privacy" | "cookie" */
  type: "privacy" | "cookie";
  /** URL di fallback se l’API non è disponibile (es. piano non Pro) */
  fallbackUrl: string;
  /** Titolo sezione */
  title: string;
  /** Se true, mostra anche i pulsanti "Visualizza cookie policy" / "Modifica preferenze" (solo per type=cookie) */
  showIubendaButtons?: boolean;
}

interface ApiResponse {
  success: boolean;
  content?: string;
  error?: string;
}

/**
 * Carica e mostra il testo della policy iubenda in pagina (Direct Text Embedding API).
 * Se l’API non è disponibile (403 Pro, 404, ecc.) mostra link e pulsanti di fallback.
 */
export default function IubendaPolicyContent({
  policyId,
  type,
  fallbackUrl,
  title,
  showIubendaButtons = true,
}: IubendaPolicyContentProps) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const iubenda = useIubenda();
  const hasProvider =
    typeof iubenda?.showCookiePolicy === "function" &&
    typeof iubenda?.openPreferences === "function";

  useEffect(() => {
    if (!policyId) {
      setLoading(false);
      setData({ success: false });
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/iubenda-policy?id=${encodeURIComponent(policyId)}&type=${type}`)
      .then((res) => res.json())
      .then((json: ApiResponse) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setData({ success: false });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [policyId, type]);

  if (loading) {
    return (
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        <p className="text-muted text-sm">Caricamento in corso...</p>
      </section>
    );
  }

  if (data?.success && data.content) {
    return (
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        <div
          className="prose prose-invert prose-sm max-w-none text-muted [&_a]:text-accent [&_a]:hover:underline"
          dangerouslySetInnerHTML={{ __html: data.content }}
        />
        <p className="text-muted text-xs pt-2">
          <a href={fallbackUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
            Apri su iubenda
          </a>
        </p>
      </section>
    );
  }

  // Fallback: link e pulsanti
  return (
    <section className="space-y-2">
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <p className="text-muted">
        {type === "cookie" && showIubendaButtons && hasProvider ? (
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
              Modifica preferenze
            </button>
            {" · "}
          </>
        ) : null}
        <a href={fallbackUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
          Apri in nuova scheda
        </a>
      </p>
    </section>
  );
}
