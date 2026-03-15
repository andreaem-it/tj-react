"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "newsletter-dismissed-v1";

export default function NewsletterModal() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      const dismissed = window.localStorage.getItem(STORAGE_KEY);
      if (!dismissed) {
        // Mostra il box dopo un breve delay per non disturbare subito.
        const t = setTimeout(() => setOpen(true), 4000);
        return () => clearTimeout(t);
      }
    } catch {
      // ignore
    }
  }, []);

  const close = () => {
    setOpen(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || submitting) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage("Iscrizione completata! Controlla la tua casella email.");
        close();
      } else {
        setMessage(
          typeof data?.error === "string"
            ? data.error
            : "Impossibile completare l'iscrizione, riprova più tardi."
        );
      }
    } catch {
      setMessage("Errore di rete, riprova.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-2.5 pb-4 sm:pb-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="newsletter-title"
    >
      <div className="max-w-xl w-full rounded-2xl bg-sidebar-bg border border-border shadow-xl p-4 sm:p-6 flex flex-col sm:flex-row gap-4 items-start">
        <div className="flex-1 min-w-0">
          <h2 id="newsletter-title" className="text-foreground font-semibold text-base sm:text-lg mb-1">
            Iscriviti alla newsletter di TechJournal
          </h2>
          <p className="text-muted text-sm mb-3">
            Ricevi le migliori notizie, offerte e guide direttamente nella tua inbox.
          </p>
          <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="La tua email"
              className="flex-1 rounded-lg border border-border bg-surface-overlay px-3 py-2 text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-accent text-gray-900 text-sm font-medium hover:opacity-90 disabled:opacity-60 transition-opacity whitespace-nowrap"
            >
              {submitting ? "Invio..." : "Iscriviti"}
            </button>
          </form>
          {message && (
            <p className="text-muted text-xs mt-2">
              {message}
            </p>
          )}
          <p className="text-muted text-[11px] mt-2">
            Iscrivendoti accetti la nostra informativa sulla privacy. Nessuno spam, promesso.
          </p>
        </div>
        <button
          type="button"
          onClick={close}
          className="ml-auto sm:ml-0 shrink-0 rounded-full p-1.5 text-muted hover:text-accent hover:bg-surface-overlay transition-colors"
          aria-label="Chiudi newsletter"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

