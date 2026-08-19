import type { PostWithMeta } from "@/lib/api";

/**
 * Data ultima modifica ISO per SEO/JSON-LD; fallback alla pubblicazione se l’API
 * non espone `modified`.
 *
 * Accetta il minimo indispensabile invece di `PostWithMeta`: così funziona sia
 * col post completo (pagina articolo) sia con i `PostListItem` di feed e liste.
 */
export function postModifiedIso(post: Pick<PostWithMeta, "date" | "modified">): string {
  const m = typeof post.modified === "string" ? post.modified.trim() : "";
  return m.length > 0 ? m : post.date;
}

/**
 * Scarto minimo fra pubblicazione e modifica perché la modifica sia un
 * *aggiornamento* da dichiarare al lettore.
 *
 * WordPress aggiorna `modified` a ogni salvataggio: la correzione di un refuso
 * o la sostituzione dell'immagine in evidenza nei minuti successivi alla
 * pubblicazione producono un `modified` diverso da `date` senza che sia
 * cambiata una virgola di sostanza. Ventiquattro ore separano la rifinitura del
 * pezzo appena uscito dall'intervento successivo, che è quello che vale la pena
 * segnalare.
 */
const MIN_UPDATE_GAP_MS = 24 * 60 * 60 * 1000;

/**
 * Data di aggiornamento da mostrare in pagina, oppure `null` se l'articolo non
 * è stato realmente aggiornato dopo la pubblicazione (§19).
 *
 * Distinta da `postModifiedIso`, che serve a `dateModified` in JSON-LD e deve
 * restituire sempre un valore: qui la domanda è diversa — "c'è qualcosa da dire
 * al lettore?" — e la risposta corretta è spesso no.
 */
export function articleUpdatedIso(
  post: Pick<PostWithMeta, "date" | "modified">,
): string | null {
  const modified = typeof post.modified === "string" ? post.modified.trim() : "";
  if (!modified) return null;

  const modifiedMs = new Date(modified).getTime();
  const publishedMs = new Date(post.date).getTime();
  // Date malformate: nessun confronto sensato, quindi non si dichiara nulla.
  if (!Number.isFinite(modifiedMs) || !Number.isFinite(publishedMs)) return null;

  return modifiedMs - publishedMs >= MIN_UPDATE_GAP_MS ? modified : null;
}
