"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";

/**
 * Punto d'ingresso della ricerca globale: scorciatoia da tastiera e pulsante.
 *
 * È l'unica parte sempre presente nel bundle, ed è volutamente minuscola: un
 * ascoltatore di tastiera e uno stato booleano. La tendina vera arriva solo
 * quando serve.
 *
 * `ssr: false` non è un dettaglio di configurazione: la ricerca non esiste
 * finché non la si apre, quindi non ha nulla da rendere lato server e
 * prerenderizzarla aggiungerebbe markup a ogni pagina del sito senza che nessuno
 * lo veda (§22).
 */
const SearchDialog = dynamic(() => import("@/components/search/SearchDialog"), { ssr: false });

export default function SearchLauncher({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // ⌘K su macOS, Ctrl+K altrove: è la combinazione che chi cerca una
      // ricerca rapida prova per prima.
      if (event.key.toLowerCase() !== "k" || !(event.metaKey || event.ctrlKey)) return;
      event.preventDefault();
      setOpen((value) => !value);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  /**
   * Blocca lo scorrimento della pagina sotto la tendina.
   *
   * Senza, su mobile lo scorrimento "passa attraverso" il pannello e si finisce
   * per muovere l'articolo dietro invece dell'elenco dei risultati.
   */
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex h-11 w-11 shrink-0 items-center justify-center ${className ?? ""}`}
        aria-label="Cerca su TechJournal"
        aria-keyshortcuts="Meta+K Control+K"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </button>
      {open && <SearchDialog onClose={close} />}
    </>
  );
}
