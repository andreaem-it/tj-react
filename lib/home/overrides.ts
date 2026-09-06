/**
 * Sovrascritture manuali della home (§87).
 *
 * Ogni sistema automatico importante deve poter essere corretto a mano. Questo
 * è il punto in cui si interviene: nessuna delle due leve è necessaria al
 * funzionamento della home, che si compone da sola.
 *
 * ## Perché il pinning resta nel repository
 *
 * WordPress non espone i campi che servirebbero per il pinning (`pinned`,
 * `boost`) e aggiungerli richiede un intervento sul plugin e un deploy del
 * backend. Un file versionato dà subito la funzionalità, lascia traccia di
 * chi ha deciso cosa e non può andare fuori sincrono con il codice che lo
 * legge. Il limite è che modificare questo file richiede un deploy del
 * frontend — accettabile per il pinning, che è una decisione ponderata, non
 * una reazione a caldo.
 *
 * ## Breaking: non più qui
 *
 * Il breaking news *era* qui (array `BREAKING_ENTRIES` scritto a mano), ma
 * per un evento in sviluppo un deploy per accendere/spegnere la barra è
 * esattamente il ritardo che il §12 vuole evitare. La sorgente ora è
 * `tj_breaking_kind`/`tj_breaking_expires_at` su WordPress (editabile
 * dall'admin in `/articoli/wp/:id/breaking`, nessun deploy) —
 * `breakingEntryFromPost()` converte un post con quei campi in una
 * `BreakingEntry`, `BREAKING_ENTRIES` resta come fallback manuale per un
 * caso limite che non passa da un articolo pubblicato (es. un avviso che non
 * corrisponde a nessun post).
 */

import type { RankingOverrides } from "@/lib/home/ranking";
import { getCategoryUrlSlugFromWpSlug, type PostListItem } from "@/lib/api";

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
 * Notizie in evidenza dichiarate a mano — fallback per un avviso che non
 * corrisponde a nessun articolo pubblicato. Normalmente vuoto: la fonte
 * primaria del breaking sono i post WordPress con `tj_breaking_kind`
 * compilato (vedi `breakingEntryFromPost`), non questo array.
 */
export const BREAKING_ENTRIES: readonly BreakingEntry[] = [];

/**
 * Converte un post con `breaking` compilato in una `BreakingEntry`.
 *
 * `null` se il post non ha `breaking` — è la lettura corretta per la
 * stragrande maggioranza degli articoli, non un caso d'errore. Non valuta la
 * scadenza qui: quello è compito di `activeBreaking`, che deve poter
 * scegliere tra più candidati con la stessa logica indipendentemente da dove
 * vengono.
 */
export function breakingEntryFromPost(post: PostListItem): BreakingEntry | null {
  if (!post.breaking) return null;
  return {
    slug: post.slug,
    href: `/${getCategoryUrlSlugFromWpSlug(post.categorySlug)}/${post.slug}`,
    label: post.title,
    kind: post.breaking.kind,
    expiresAt: post.breaking.expiresAt,
    priority: post.breaking.priority ?? undefined,
  };
}

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
