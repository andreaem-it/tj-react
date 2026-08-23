"use client";

import { useEffect } from "react";
import TjLink from "@/components/TjLink";

export default function ArticleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[article-error]", error);
  }, [error]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center px-4 py-16">
      <h1 className="text-2xl font-bold text-foreground mb-2">Articolo temporaneamente non disponibile</h1>
      <p className="text-muted mb-6 text-center max-w-md">
        Il server è sotto carico o la pagina non è ancora in cache. Riprova tra qualche secondo.
      </p>
      <div className="flex gap-4">
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-11 items-center px-4 py-2 bg-accent text-gray-900 font-medium rounded hover:opacity-90"
        >
          Riprova
        </button>
        <TjLink
          href="/"
          className="px-4 py-2 border border-border rounded font-medium hover:bg-surface-overlay"
        >
          Torna alla Home
        </TjLink>
      </div>
    </div>
  );
}
