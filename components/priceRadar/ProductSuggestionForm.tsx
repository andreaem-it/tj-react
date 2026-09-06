"use client";

import { FormEvent, useState } from "react";

type SubmissionState = "idle" | "submitting" | "pending" | "already_tracked" | "error";

export default function ProductSuggestionForm() {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [state, setState] = useState<SubmissionState>("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "submitting") return;
    setState("submitting");
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/price-radar/suggestions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, title, website: form.get("website") }),
      });
      const payload = (await response.json().catch(() => ({}))) as { status?: string; error?: string };
      if (!response.ok) throw new Error(payload.error || "Non è stato possibile inviare la proposta");
      const alreadyTracked = payload.status === "already_tracked";
      setState(alreadyTracked ? "already_tracked" : "pending");
      setMessage(
        alreadyTracked
          ? "Questo prodotto è già monitorato: puoi trovarlo nel catalogo."
          : "Proposta ricevuta. La verificheremo prima di aggiungerla al monitoraggio.",
      );
      if (!alreadyTracked) {
        setUrl("");
        setTitle("");
      }
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Non è stato possibile inviare la proposta");
    }
  }

  return (
    <details className="group rounded-xl border border-border bg-content-bg">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 font-semibold text-foreground marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:px-5">
        <span>
          Non trovi un prodotto? <span className="font-normal text-muted">Proponilo al Price Radar</span>
        </span>
        <span aria-hidden="true" className="text-xl text-accent transition-transform group-open:rotate-45">+</span>
      </summary>
      <form onSubmit={submit} className="border-t border-border px-4 py-5 sm:px-5" aria-label="Proponi un prodotto da monitorare">
        <p className="mb-4 max-w-2xl text-sm leading-6 text-muted">
          Incolla il link della pagina prodotto su Amazon.it. Le proposte vengono controllate prima di entrare nel catalogo.
        </p>
        <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] md:items-end">
          <label className="grid gap-1.5 text-sm font-medium text-foreground">
            Link Amazon.it <span className="sr-only">obbligatorio</span>
            <input
              type="url"
              required
              inputMode="url"
              autoComplete="url"
              maxLength={2048}
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://www.amazon.it/dp/..."
              className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-foreground">
            Nome prodotto <span className="font-normal text-muted">(facoltativo)</span>
            <input
              type="text"
              maxLength={180}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Es. cuffie, monitor…"
              className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
          </label>
          <label className="absolute -left-[10000px]" aria-hidden="true">
            Sito web
            <input name="website" type="text" tabIndex={-1} autoComplete="off" />
          </label>
          <button
            type="submit"
            disabled={state === "submitting"}
            className="min-h-11 rounded-lg bg-accent px-5 font-semibold text-black transition-[filter] hover:brightness-95 disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-content-bg"
          >
            {state === "submitting" ? "Invio…" : "Proponi prodotto"}
          </button>
        </div>
        <p
          className={`mt-4 text-sm ${state === "error" ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"}`}
          role="status"
          aria-live="polite"
        >
          {message}
        </p>
      </form>
    </details>
  );
}
