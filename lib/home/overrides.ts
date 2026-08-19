/**
 * Sovrascritture manuali della home (§87).
 *
 * Ogni sistema automatico importante deve poter essere corretto a mano. Questo
 * è il punto in cui si interviene: nessuna delle due leve è necessaria al
 * funzionamento della home, che si compone da sola.
 *
 * ## Perché nel repository e non nel CMS
 *
 * Per la stessa ragione del registry degli argomenti: WordPress non espone i
 * campi che servirebbero (`isBreaking`, `pinned`, `boost`) e aggiungerli
 * richiede un intervento sul plugin e un deploy del backend. Un file versionato
 * dà subito la funzionalità, lascia traccia di chi ha deciso cosa e non può
 * andare fuori sincrono con il codice che lo legge.
 *
 * **Il limite va detto chiaramente**: modificare questo file richiede un deploy
 * del frontend. Per il fissaggio di un articolo è accettabile — è una decisione
 * ponderata, non una reazione a caldo. Per il breaking lo è molto meno, ed è il
 * motivo per cui la sorgente definitiva dovrà essere un campo su WordPress
 * (`isBreaking`, `breakingExpiresAt`) letto da `tj/v1`. Quando esisterà,
 * `activeBreaking()` cambierà sorgente senza che cambi nulla a valle.
 */

import type { RankingOverrides } from "@/lib/home/ranking";

/**
 * Fissaggi e correzioni al punteggio della home.
 *
 * `pinned`: slug degli articoli da tenere in apertura, nell'ordine indicato.
 * `boost`: correzione additiva al punteggio. Per riferimento, il termine di
 * freschezza vale al massimo 1: un boost di 0,3 sposta di qualche posizione, uno
 * di 2 porta praticamente in cima — nel qual caso conviene usare `pinned`, che
 * dichiara l'intenzione invece di simularla.
 *
 * Normalmente vuoto: la home non ha bisogno di curatela quotidiana.
 */
export const HOME_RANKING_OVERRIDES: RankingOverrides = {
  pinned: [],
  boost: {},
};

/** Etichetta della barra: notizia in sviluppo oppure evento in diretta. */
export type BreakingKind = "breaking" | "live";

export interface BreakingEntry {
  /** Slug dell'articolo a cui la barra rimanda. */
  slug: string;
  /** Percorso completo dell'articolo (`/apple/...`): la barra non risolve categorie. */
  href: string;
  /** Testo mostrato, breve. Se assente si usa il titolo dell'articolo. */
  label: string;
  kind: BreakingKind;
  /**
   * Scadenza in ISO 8601.
   *
   * Obbligatoria e senza valore predefinito: una barra "BREAKING" che resta su
   * per giorni smette di significare qualcosa e diventa parte dell'arredamento
   * (§12). Chi la accende deve dichiarare quando si spegne.
   */
  expiresAt: string;
  /** A parità di validità vince il numero più basso. */
  priority?: number;
}

/**
 * Notizie in evidenza dichiarate a mano.
 *
 * Normalmente vuoto. La barra compare solo quando c'è davvero qualcosa, e
 * sparisce da sola alla scadenza senza che nessuno debba ricordarsene.
 */
export const BREAKING_ENTRIES: readonly BreakingEntry[] = [];

/**
 * La voce di breaking attiva in questo istante, se esiste.
 *
 * `now` è un parametro e non `Date.now()` perché la scadenza deve essere
 * verificabile in un test senza dipendere dal momento in cui gira.
 */
export function activeBreaking(
  now: number,
  entries: readonly BreakingEntry[] = BREAKING_ENTRIES,
): BreakingEntry | null {
  const valid = entries.filter((entry) => {
    const expiry = new Date(entry.expiresAt).getTime();
    // Una scadenza illeggibile equivale a scaduta: nel dubbio la barra non si
    // accende, che è l'errore meno grave dei due.
    if (!Number.isFinite(expiry)) return false;
    return expiry > now;
  });

  if (valid.length === 0) return null;

  return valid.sort(
    (a, b) =>
      (a.priority ?? Number.MAX_SAFE_INTEGER) - (b.priority ?? Number.MAX_SAFE_INTEGER) ||
      new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime(),
  )[0];
}
