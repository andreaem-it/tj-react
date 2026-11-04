"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useDialogFocus } from "./useDialogFocus";
import { trackEvent } from "@/lib/analytics/client";

const STORAGE_KEY = "newsletter-dismissed-v1";
const SUCCESS_AUTO_CLOSE_MS = 2500;

export default function NewsletterModal() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [newsletterConsent, setNewsletterConsent] = useState(false);
  const [pixelTrackingConsent, setPixelTrackingConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      const dismissed = window.localStorage.getItem(STORAGE_KEY);
      if (!dismissed) {
        // Mostra il box dopo un breve delay per non disturbare subito.
        const t = setTimeout(() => {
          setOpen(true);
          trackEvent("newsletter_form_view", { form_location: "modal" });
        }, 4000);
        return () => clearTimeout(t);
      }
    } catch {
      // ignore
    }
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
  }, []);
  const dialogRef = useDialogFocus<HTMLDivElement>(open, close);

  // Dopo l'iscrizione riuscita il messaggio resta visibile, poi il box si
  // chiude da solo (chiusura manuale sempre possibile con il pulsante X).
  // Il flag localStorage viene scritto subito al successo: se l'utente naviga
  // via prima dei 2500 ms il cleanup cancella il timer ma il flag è già persistito.
  useEffect(() => {
    if (status !== "success") return;
    try { window.localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
    const t = setTimeout(() => setOpen(false), SUCCESS_AUTO_CLOSE_MS);
    return () => clearTimeout(t);
  }, [status]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !newsletterConsent || submitting || status === "success") return;
    setSubmitting(true);
    trackEvent("newsletter_start", { form_location: "modal" });
    setStatus("idle");
    setMessage(null);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          newsletterConsent,
          pixelTrackingConsent,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus("success");
        setMessage("Iscrizione completata! Controlla la tua casella email.");
        trackEvent("generate_lead", { method: "newsletter", form_location: "modal" });
      } else {
        trackEvent("newsletter_error", { form_location: "modal", error_type: "server" });
        setStatus("error");
        setMessage(
          typeof data?.error === "string"
            ? data.error
            : "Impossibile completare l'iscrizione, riprova più tardi."
        );
      }
    } catch {
      trackEvent("newsletter_error", { form_location: "modal", error_type: "network" });
      setStatus("error");
      setMessage("Errore di rete, riprova.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      ref={dialogRef}
      className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-2.5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 sm:pb-6 pointer-events-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="newsletter-title"
    >
      <div className="pointer-events-auto relative w-full max-w-xl rounded-dialog border border-border bg-sidebar-bg p-4 pt-12 shadow-overlay sm:p-panel sm:pt-6">
        <button
          type="button"
          onClick={close}
          className="absolute right-3 top-3 z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-overlay border border-border text-foreground hover:bg-content-bg hover:text-accent transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label="Chiudi newsletter"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="min-w-0 pr-1">
          <h2 id="newsletter-title" className="text-foreground font-semibold text-base sm:text-lg mb-1 pr-2">
            Iscriviti alla newsletter di TechJournal
          </h2>
          <p className="text-muted text-sm mb-3">
            Ricevi le migliori notizie, offerte e guide direttamente nella tua inbox.
          </p>
          <form
            onSubmit={onSubmit}
            className="space-y-3"
            tool-name="newsletter-subscribe"
            tool-description="Subscribe a user email to TechJournal newsletter updates"
          >
            <div className="flex flex-col sm:flex-row gap-2">
              <label htmlFor="newsletter-email" className="sr-only">
                Indirizzo email
              </label>
              <input
                id="newsletter-email"
                type="email"
                name="email"
                tool-param-description="Email address to subscribe"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="La tua email"
                className="flex-1 rounded-lg border border-border bg-surface-overlay px-3 py-2 text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent min-h-11"
              />
              <button
                type="submit"
                disabled={submitting || !newsletterConsent || status === "success"}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-accent text-gray-900 text-sm font-medium hover:opacity-90 disabled:opacity-60 transition-opacity whitespace-nowrap min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {submitting ? "Invio..." : status === "success" ? "Iscritto!" : "Iscriviti"}
              </button>
            </div>
            <div className="flex items-start gap-2 text-xs leading-5 text-muted">
              <input
                id="newsletter-consent"
                type="checkbox"
                required
                checked={newsletterConsent}
                onChange={(e) => setNewsletterConsent(e.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]"
              />
              <span>
                <label htmlFor="newsletter-consent">
                  Voglio ricevere la newsletter di TechJournal e dichiaro di aver letto
                </label>{" "}
                l’<Link href="/privacy#newsletter" className="text-accent hover:underline">informativa privacy</Link>.
              </span>
            </div>
            <label className="flex items-start gap-2 text-xs leading-5 text-muted">
              <input
                type="checkbox"
                checked={pixelTrackingConsent}
                onChange={(e) => setPixelTrackingConsent(e.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]"
              />
              <span>
                Facoltativo: acconsento al tracciamento individuale di aperture e clic
                tramite pixel e link personalizzati, per misurare e migliorare la newsletter.
                Posso revocarlo in ogni email senza disiscrivermi.
              </span>
            </label>
          </form>
          {message && (
            <p
              role="status"
              className={`text-xs mt-2 ${
                status === "success"
                  ? "text-green-500 font-medium"
                  : status === "error"
                    ? "text-red-500"
                    : "text-muted"
              }`}
            >
              {message}
            </p>
          )}
          <p className="text-muted text-[11px] mt-2">
            Se non accetti il tracciamento continuerai comunque a ricevere la newsletter.
          </p>
        </div>
      </div>
    </div>
  );
}
