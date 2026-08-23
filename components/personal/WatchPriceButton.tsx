"use client";

import { useEffect, useId, useState } from "react";
import TjLink from "@/components/TjLink";
import { usePersonal } from "@/lib/personal/usePersonal";
import { findWatchedProduct, unwatchProduct, watchProduct } from "@/lib/personal/store";
import { formatEuro } from "@/lib/priceRadar/rating";
import { getActivePushSubscriptionEndpoint } from "@/lib/push/subscription";

/**
 * "Avvisami quando scende" con soglia di prezzo (§24).
 *
 * ## Cosa fa e cosa non fa, dichiarato all'utente
 *
 * Registra sempre il prodotto e la soglia nel browser (`localStorage`), come
 * prima. **In più**, se questo browser ha le notifiche push attive
 * (`PushOptIn`), registra lo stesso avviso anche lato server — da lì uno
 * scraper confronta la soglia a ogni rilevazione e manda una notifica reale
 * quando scatta (`tj-api`, `checkAndNotifyWatches`).
 *
 * Senza notifiche attive resta come prima: salvato solo nel browser, nessun
 * avviso. Il componente lo dice esplicitamente in entrambi i casi — promettere
 * un avviso che non arriverà è il modo più rapido di perdere chi si fida.
 */
async function registerServerWatch(asin: string, targetPrice: number | null): Promise<void> {
  if (targetPrice == null || !Number.isFinite(targetPrice) || targetPrice <= 0) return;
  try {
    const endpoint = await getActivePushSubscriptionEndpoint();
    if (!endpoint) return;
    const response = await fetch("/api/price-radar/watch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint, asin, targetPrice }),
    });
    if (!response.ok) throw new Error(`Registrazione price alert fallita: ${response.status}`);
  } catch {
    // Resta salvato in locale: al prossimo salvataggio (o al prossimo avvio
    // con notifiche attive) si riprova. Non è un errore da mostrare qui.
  }
}

async function removeServerWatch(asin: string): Promise<void> {
  try {
    const endpoint = await getActivePushSubscriptionEndpoint();
    if (!endpoint) return;
    const response = await fetch("/api/price-radar/watch", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint, asin }),
    });
    if (!response.ok) throw new Error(`Rimozione price alert fallita: ${response.status}`);
  } catch {
    // La rimozione locale resta valida anche se il backend non è raggiungibile.
  }
}

export default function WatchPriceButton({
  asin,
  title,
  currentPrice,
  currency = "EUR",
  className,
}: {
  asin: string;
  title: string;
  currentPrice: number | null;
  currency?: string;
  className?: string;
}) {
  const { data, hydrated, update } = usePersonal();
  const inputId = useId();
  const watched = hydrated ? findWatchedProduct(data, asin) : undefined;
  const [open, setOpen] = useState(false);
  /** Soglia proposta: il 10% sotto il prezzo di oggi, arrotondato all'euro. */
  const [target, setTarget] = useState(() =>
    currentPrice != null && currentPrice > 0 ? String(Math.floor(currentPrice * 0.9)) : "",
  );
  const [targetError, setTargetError] = useState<string | null>(null);
  /** `null` finché non è nota: evita di mostrare per un istante il messaggio sbagliato. */
  const [pushActive, setPushActive] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    getActivePushSubscriptionEndpoint()
      .then((endpoint) => {
        if (!cancelled) setPushActive(Boolean(endpoint));
      })
      .catch(() => {
        if (!cancelled) setPushActive(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (watched) {
    return (
      <div className={`text-sm ${className ?? ""}`}>
        <p className="text-muted">
          Lo tieni d&apos;occhio
          {watched.targetPrice != null && (
            <> sotto {formatEuro(watched.targetPrice, currency)}</>
          )}
          .{" "}
          <button
            type="button"
            onClick={() => {
              update((current) => unwatchProduct(current, asin));
              void removeServerWatch(asin);
            }}
            className="text-accent hover:underline"
          >
            Non seguire più
          </button>
        </p>
        <p className="mt-1 text-xs text-muted">
          {pushActive ? (
            "Notifiche attive: ti avviseremo su questo browser quando il prezzo raggiunge la soglia."
          ) : (
            <>
              Salvato in questo browser. Non invia notifiche: la soglia viene verificata quando
              torni, in{" "}
              <TjLink href="/personale" className="text-accent hover:underline">
                Area personale
              </TjLink>
              .
            </>
          )}
        </p>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        disabled={!hydrated}
        onClick={() => setOpen(true)}
        className={`inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-surface-overlay disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background ${className ?? ""}`}
      >
        <span aria-hidden>◎</span>
        Tieni d&apos;occhio il prezzo
      </button>
    );
  }

  return (
    <form
      className={`rounded-lg border border-border bg-surface-overlay p-4 ${className ?? ""}`}
      onSubmit={(event) => {
        event.preventDefault();
        const parsed = Number.parseFloat(target.replace(",", "."));
        if (!Number.isFinite(parsed) || parsed <= 0) {
          setTargetError("Inserisci una soglia maggiore di zero.");
          return;
        }
        const targetPrice = parsed;
        update((current) =>
          watchProduct(current, { asin, title, targetPrice }, Date.now()),
        );
        void registerServerWatch(asin, targetPrice);
        setOpen(false);
      }}
    >
      <label htmlFor={inputId} className="block text-sm font-medium text-foreground">
        Segnalami sotto
      </label>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          id={inputId}
          type="text"
          inputMode="decimal"
          value={target}
          onChange={(event) => {
            setTarget(event.target.value);
            if (targetError) setTargetError(null);
          }}
          placeholder="es. 45"
          required
          aria-invalid={targetError ? "true" : undefined}
          aria-describedby={targetError ? `${inputId}-error` : undefined}
          className="min-h-11 w-28 rounded-lg border border-border bg-content-bg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <span className="text-sm text-muted">{currency === "EUR" ? "€" : currency}</span>
        <button
          type="submit"
          className="min-h-11 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-gray-900 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Salva
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="min-h-11 rounded px-2 text-sm text-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Annulla
        </button>
      </div>
      {targetError && (
        <p id={`${inputId}-error`} role="alert" className="mt-2 text-xs text-red-500">
          {targetError}
        </p>
      )}
      <p className="mt-2 text-xs text-muted">
        {pushActive
          ? "Notifiche attive su questo browser: ti avviseremo quando il prezzo raggiunge la soglia."
          : "Salvato solo in questo browser. Non invia notifiche: la soglia viene verificata quando torni sul sito."}
      </p>
    </form>
  );
}
