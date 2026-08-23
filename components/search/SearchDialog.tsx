"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDialogFocus } from "@/components/useDialogFocus";
import type { SearchResponse, SearchResult } from "@/lib/search/types";

/**
 * Tendina della ricerca globale.
 *
 * Caricata su richiesta da `SearchLauncher`: finché non si apre, nulla di questo
 * file arriva al browser.
 *
 * ## Accessibilità
 *
 * Segue il modello combobox: il campo dichiara `aria-expanded` e
 * `aria-activedescendant`, l'elenco è un `listbox` e ogni riga un `option`. La
 * navigazione con le frecce **non sposta il fuoco** dal campo — chi usa uno
 * screen reader continua a poter digitare mentre ascolta la voce selezionata,
 * ed è il motivo per cui la selezione è un attributo e non un `focus()`.
 */

/**
 * Pausa nella digitazione prima di interrogare il server.
 *
 * A 180 ms una digitazione normale produce una richiesta per parola invece che
 * per carattere, e chi si ferma a pensare vede i risultati prima di accorgersi
 * di aspettare.
 */
const DEBOUNCE_MS = 180;

const MIN_QUERY_LENGTH = 2;

interface SearchDialogProps {
  onClose: () => void;
}

export default function SearchDialog({ onClose }: SearchDialogProps) {
  const router = useRouter();
  const baseId = useId();
  const listboxId = `${baseId}-listbox`;
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useDialogFocus<HTMLDivElement>(true, onClose);

  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  /**
   * Query già richieste in questa sessione.
   *
   * Tornare indietro con il backspace ripercorre prefissi già cercati: senza
   * questa memoria ogni cancellazione ricomincerebbe da capo con una richiesta
   * di rete.
   */
  const cacheRef = useRef(new Map<string, SearchResponse>());

  const flat: SearchResult[] = (response?.groups ?? []).flatMap((group) => group.results);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setResponse(null);
      setLoading(false);
      return;
    }

    const cached = cacheRef.current.get(trimmed);
    if (cached) {
      setResponse(cached);
      setActiveIndex(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as SearchResponse;
        cacheRef.current.set(trimmed, data);
        setResponse(data);
        setActiveIndex(0);
      } catch (error) {
        // L'annullamento è il caso normale: succede a ogni tasto premuto mentre
        // una richiesta è in volo, e non è una condizione da segnalare.
        if ((error as Error)?.name === "AbortError") return;
        console.error("[Search] richiesta fallita:", error);
        setResponse({ query: trimmed, groups: [] });
      } finally {
        // Una query precedente abortita può terminare dopo che quella nuova è
        // già partita: non deve spegnere il suo indicatore di caricamento.
        if (!controller.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  const go = useCallback(
    (href: string) => {
      onClose();
      router.push(href);
    },
    [onClose, router],
  );

  const submitFullSearch = useCallback(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    go(`/search?q=${encodeURIComponent(trimmed)}`);
  }, [go, query]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (flat.length === 0 ? 0 : (index + 1) % flat.length));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (flat.length === 0 ? 0 : (index - 1 + flat.length) % flat.length));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const target = flat[activeIndex];
      if (target) go(target.href);
      else submitFullSearch();
    }
  };

  const trimmed = query.trim();
  const showEmpty =
    trimmed.length >= MIN_QUERY_LENGTH && !loading && response !== null && flat.length === 0;

  let runningIndex = -1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 p-4 pt-[8vh]"
      onMouseDown={(event) => {
        // Solo il clic sullo sfondo chiude: `mousedown` sul pannello non deve
        // propagarsi, altrimenti selezionare del testo e rilasciare fuori dal
        // riquadro chiuderebbe la ricerca.
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Cerca su TechJournal"
        className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-content-bg shadow-2xl"
      >
        <div className="flex items-center gap-3 border-b border-border px-4">
          <svg
            className="h-5 w-5 shrink-0 text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Cerca articoli, argomenti, dispositivi, prezzi…"
            className="min-w-0 flex-1 bg-transparent py-4 text-base text-foreground outline-none placeholder:text-muted"
            role="combobox"
            aria-expanded={flat.length > 0}
            aria-controls={listboxId}
            aria-activedescendant={flat[activeIndex] ? `${baseId}-opt-${activeIndex}` : undefined}
            aria-autocomplete="list"
            aria-label="Cerca su TechJournal"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded border border-border px-3 text-xs text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label="Chiudi ricerca"
          >
            Esc
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {trimmed.length < MIN_QUERY_LENGTH && (
            <p className="px-4 py-8 text-center text-sm text-muted">
              Cerca fra articoli, argomenti, schede di compatibilità e prezzi monitorati.
            </p>
          )}

          {showEmpty && (
            <p className="px-4 py-8 text-center text-sm text-muted">
              Nessun risultato per «{trimmed}».
            </p>
          )}

          {response?.articlesUnavailable && (
            <p className="border-b border-border px-4 py-2 text-xs text-muted">
              La ricerca fra gli articoli non è raggiungibile: qui sotto ci sono solo argomenti,
              schede e prodotti.
            </p>
          )}

          <ul id={listboxId} role="listbox" aria-label="Risultati">
            {(response?.groups ?? []).map((group) => (
              <li key={group.kind} role="presentation">
                <p
                  className="sticky top-0 bg-content-bg px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted"
                  role="presentation"
                >
                  {group.label}
                </p>
                <ul role="presentation">
                  {group.results.map((result) => {
                    runningIndex += 1;
                    const index = runningIndex;
                    const active = index === activeIndex;
                    return (
                      <li
                        key={`${result.kind}-${result.id}`}
                        id={`${baseId}-opt-${index}`}
                        role="option"
                        aria-selected={active}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => go(result.href)}
                        className={`cursor-pointer px-4 py-2.5 ${active ? "bg-surface-overlay" : ""}`}
                      >
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="min-w-0 truncate font-medium text-foreground">
                            {result.title}
                          </span>
                          {result.badge && (
                            <span className="shrink-0 text-xs text-muted">{result.badge}</span>
                          )}
                        </div>
                        {result.subtitle && (
                          <span className="mt-0.5 block truncate text-xs text-muted">
                            {result.subtitle}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-2 text-xs text-muted">
          <span aria-hidden>↑↓ per scorrere · Invio per aprire</span>
          <button
            type="button"
            onClick={submitFullSearch}
            className="inline-flex min-h-11 items-center rounded px-2 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Vedi tutti i risultati
          </button>
        </div>
      </div>
    </div>
  );
}
