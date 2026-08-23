"use client";

import { useEffect, useState } from "react";
import { fetchSocialStats } from "@/lib/tjApiClient";

interface SocialCounts {
  facebook: number | null;
  instagram: number | null;
}

/**
 * Pulsanti "Segui" Facebook/Instagram con contatori reali da /api/social-stats.
 * Se il fetch fallisce (o un valore manca) il numero non viene mostrato:
 * mai dati hardcoded/falsi.
 */
export default function SocialFollowButtons() {
  const [counts, setCounts] = useState<SocialCounts>({ facebook: null, instagram: null });

  useEffect(() => {
    let cancelled = false;
    void fetchSocialStats()
      .then((stats) => {
        if (cancelled || !stats) return;
        const fb = stats.facebook?.followers;
        const ig = stats.instagram?.followers;
        setCounts({
          facebook: typeof fb === "number" && Number.isFinite(fb) && fb >= 0 ? fb : null,
          instagram: typeof ig === "number" && Number.isFinite(ig) && ig >= 0 ? ig : null,
        });
      })
      .catch(() => {
        // Fetch fallito: restano solo le label senza numeri.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const fbLabel =
    counts.facebook != null
      ? `${counts.facebook.toLocaleString("it-IT")} Seguono`
      : "Seguici";
  const igLabel =
    counts.instagram != null
      ? `${counts.instagram.toLocaleString("it-IT")} Followers`
      : "Seguici";

  return (
    <div className="flex gap-4 items-start">
      <a
        href="https://www.facebook.com/techjournal.it"
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Facebook, ${fbLabel}`}
        className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded bg-[#3b5998] py-2.5 text-sm font-medium text-white hover:opacity-90"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path d="M22 12a10 10 0 10-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.88 3.78-3.88 1.1 0 2.24.2 2.24.2v2.45H15.2c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0022 12z" />
        </svg>
        <span>{fbLabel}</span>
      </a>
      <a
        href="https://www.instagram.com/techjournal.it"
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Instagram, ${igLabel}`}
        className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded bg-[#c13584] py-2.5 text-sm font-medium text-white hover:opacity-90"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path d="M12 2.16c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.64.07 4.85 0 3.2-.01 3.58-.07 4.85-.15 3.25-1.69 4.77-4.92 4.92-1.27.06-1.64.07-4.85.07-3.2 0-3.58-.01-4.85-.07-3.25-.15-4.77-1.69-4.92-4.92A69.2 69.2 0 012.16 12c0-3.2.01-3.58.07-4.85.15-3.25 1.69-4.77 4.92-4.92 1.27-.06 1.64-.07 4.85-.07zm0 2.18c-3.14 0-3.51.01-4.75.07-2.4.11-3.5 1.23-3.62 3.62-.06 1.24-.07 1.61-.07 4.75s.01 3.51.07 4.75c.11 2.4 1.23 3.5 3.62 3.62 1.24.06 1.61.07 4.75.07s3.51-.01 4.75-.07c2.4-.11 3.5-1.23 3.62-3.62.06-1.24.07-1.61.07-4.75s-.01-3.51-.07-4.75c-.11-2.4-1.23-3.5-3.62-3.62-1.24-.06-1.61-.07-4.75-.07zm0 3.53a4.13 4.13 0 110 8.26 4.13 4.13 0 010-8.26zm0 2.18a1.95 1.95 0 100 3.9 1.95 1.95 0 000-3.9zm5.26-2.35a.96.96 0 110 1.93.96.96 0 010-1.93z" />
        </svg>
        <span>{igLabel}</span>
      </a>
    </div>
  );
}
