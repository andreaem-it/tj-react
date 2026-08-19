"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  emptyPersonalData,
  parsePersonalData,
  PERSONAL_STORAGE_KEY,
  serializePersonalData,
  type PersonalData,
} from "@/lib/personal/store";

/**
 * Accesso alle preferenze personali dal browser.
 *
 * ## Perché uno store esterno e non `useState`
 *
 * Sulla stessa pagina possono coesistere più controlli che leggono gli stessi
 * dati — il pulsante "segui" in testa e quello in fondo, o due schede prodotto.
 * Con `useState` per componente ognuno terrebbe la propria copia e dopo il primo
 * clic mostrerebbero stati diversi. `useSyncExternalStore` li tiene allineati a
 * una sorgente unica, e fornisce anche lo snapshot lato server.
 *
 * ## Idratazione
 *
 * Lo snapshot server è sempre lo stato iniziale vuoto: `localStorage` non esiste
 * sul server, e restituire qualcos'altro produrrebbe markup diverso fra server e
 * client. I componenti espongono `hydrated` per non mostrare "Segui" un istante
 * prima di correggerlo in "Segui già": il primo render dichiara di non sapere
 * ancora, invece di affermare il falso.
 */

/** Snapshot condiviso: la stessa referenza finché i dati non cambiano. */
let snapshot: PersonalData | null = null;
const listeners = new Set<() => void>();

/** Snapshot server e primo snapshot client: sempre lo stato iniziale. */
const SERVER_SNAPSHOT: PersonalData = emptyPersonalData();

function readStorage(): PersonalData {
  try {
    return parsePersonalData(window.localStorage.getItem(PERSONAL_STORAGE_KEY));
  } catch {
    // Safari in navigazione privata e impostazioni restrittive fanno lanciare
    // l'accesso a `localStorage`: le preferenze non funzionano, il sito sì.
    return emptyPersonalData();
  }
}

function getSnapshot(): PersonalData {
  if (snapshot === null) snapshot = readStorage();
  return snapshot;
}

/**
 * L'evento `storage` arriva solo dalle **altre** schede: è ciò che tiene
 * allineate due finestre dello stesso sito aperte insieme.
 */
function onStorage(event: StorageEvent): void {
  if (event.key !== null && event.key !== PERSONAL_STORAGE_KEY) return;
  snapshot = readStorage();
  for (const listener of listeners) listener();
}

/**
 * Un solo ascoltatore per pagina, non uno per sottoscrizione.
 *
 * `usePersonal` chiama `useSyncExternalStore` due volte — per i dati e per lo
 * stato di idratazione — e ogni componente che usa l'hook si sottoscrive a sua
 * volta: registrare l'ascoltatore dentro `subscribe` ne creava due per ogni
 * componente montato, tutti con lo stesso effetto.
 */
let storageListenerBound = false;

function subscribe(listener: () => void): () => void {
  if (!storageListenerBound) {
    storageListenerBound = true;
    window.addEventListener("storage", onStorage);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function commit(next: PersonalData): void {
  snapshot = next;
  try {
    window.localStorage.setItem(PERSONAL_STORAGE_KEY, serializePersonalData(next));
  } catch {
    // Quota esaurita o storage negato: lo stato in memoria resta valido per
    // questa sessione, e non si perde il clic appena fatto.
  }
  for (const listener of listeners) listener();
}

export interface UsePersonalResult {
  data: PersonalData;
  /**
   * Vero quando i dati reali del browser sono stati letti.
   *
   * Prima è `false` e i dati sono lo stato iniziale: i componenti lo usano per
   * non dichiarare uno stato che potrebbe essere sbagliato.
   */
  hydrated: boolean;
  /** Applica una trasformazione pura di `lib/personal/store` e salva. */
  update: (transform: (data: PersonalData) => PersonalData) => void;
}

export function usePersonal(): UsePersonalResult {
  const data = useSyncExternalStore(subscribe, getSnapshot, () => SERVER_SNAPSHOT);
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  const update = useCallback((transform: (current: PersonalData) => PersonalData) => {
    const next = transform(getSnapshot());
    // Le funzioni dello store restituiscono lo stesso oggetto quando non c'è
    // nulla da cambiare: si evita una scrittura e un render inutili.
    if (next !== getSnapshot()) commit(next);
  }, []);

  return { data, hydrated, update };
}
