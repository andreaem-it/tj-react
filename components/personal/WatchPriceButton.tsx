"use client";

import { useId, useState } from "react";
import TjLink from "@/components/TjLink";
import { usePersonal } from "@/lib/personal/usePersonal";
import { findWatchedProduct, unwatchProduct, watchProduct } from "@/lib/personal/store";
import { formatEuro } from "@/lib/priceRadar/rating";

/**
 * "Avvisami quando scende" con soglia di prezzo (§24).
 *
 * ## Cosa fa e cosa non fa, dichiarato all'utente
 *
 * Registra nel browser il prodotto e la soglia. **Non manda notifiche**: servirebbe
 * un account, un archivio delle sottoscrizioni e chiavi push, che qui non
 * esistono. La soglia viene confrontata quando l'utente torna, e l'Area personale
 * mostra quali prodotti l'hanno raggiunta.
 *
 * Il pulsante lo dice esplicitamente invece di chiamarsi "Avvisami": promettere
 * un avviso che non arriverà è il modo più rapido di perdere chi si fida. Il
 * giorno in cui esisteranno account e push, la soglia salvata qui è già il dato
 * da sincronizzare.
 */
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
            onClick={() => update((current) => unwatchProduct(current, asin))}
            className="text-accent hover:underline"
          >
            Non seguire più
          </button>
        </p>
        <p className="mt-1 text-xs text-muted">
          Salvato in questo browser. Non invia notifiche: la soglia viene verificata quando torni,
          in <TjLink href="/personale" className="text-accent hover:underline">Area personale</TjLink>.
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
        className={`inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-surface-overlay disabled:opacity-50 ${className ?? ""}`}
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
        update((current) =>
          watchProduct(
            current,
            { asin, title, targetPrice: Number.isFinite(parsed) ? parsed : null },
            Date.now(),
          ),
        );
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
          onChange={(event) => setTarget(event.target.value)}
          placeholder="es. 45"
          className="min-h-11 w-28 rounded-lg border border-border bg-content-bg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <span className="text-sm text-muted">{currency === "EUR" ? "€" : currency}</span>
        <button
          type="submit"
          className="min-h-11 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-gray-900 transition-opacity hover:opacity-90"
        >
          Salva
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="min-h-11 px-2 text-sm text-muted hover:text-foreground"
        >
          Annulla
        </button>
      </div>
      <p className="mt-2 text-xs text-muted">
        Salvato solo in questo browser. Non invia notifiche: la soglia viene verificata quando torni
        sul sito.
      </p>
    </form>
  );
}
