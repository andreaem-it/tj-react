"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[error boundary]", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <h1 className="text-2xl font-bold text-foreground mb-2">Si è verificato un errore</h1>
      <p className="text-muted mb-6 text-center max-w-md">
        Qualcosa è andato storto. Puoi riprovare o tornare alla home.
      </p>
      <div className="flex gap-4">
        <button
          type="button"
          onClick={reset}
          className="px-4 py-2 bg-accent text-gray-900 font-medium rounded hover:opacity-90"
        >
          Riprova
        </button>
        <Link
          href="/"
          className="px-4 py-2 border border-border rounded font-medium hover:bg-surface-overlay"
        >
          Torna alla Home
        </Link>
      </div>
    </div>
  );
}
