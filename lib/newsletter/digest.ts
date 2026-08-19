import { getCategoryUrlSlugFromWpSlug, type PostListItem } from "@/lib/api";
import { isCorrelatingTopic } from "@/lib/content/related";
import type { RankedItem } from "@/lib/home/ranking";
import { seoDescription } from "@/lib/seo";
import type { Topic } from "@/lib/content/types";

/**
 * Composizione del digest della newsletter (§43, §44).
 *
 * Modulo puro e deterministico: nessun I/O, nessuna chiamata a un modello.
 *
 * ## La sostituzione rispetto al progetto
 *
 * La pipeline prevista termina con "LLM genera introduzioni brevissime". Qui le
 * introduzioni sono gli **excerpt degli articoli**, e non è un ripiego: l'excerpt
 * è già una sintesi scritta per quell'articolo, mentre un riassunto generato
 * sarebbe una seconda sintesi dello stesso testo — a pagamento, non verificata, e
 * capace di introdurre affermazioni che l'articolo non contiene. Per il compito
 * "spiega in due righe di cosa parla questo pezzo" il dato migliore esiste già.
 *
 * Resta il caso in cui l'excerpt manca: lì si usa il titolo, e non si inventa.
 */

/** Prodotti di newsletter previsti; oggi ne è implementato uno. */
export type DigestKind = "daily";

export interface DigestItem {
  post: PostListItem;
  /** Percorso relativo dell'articolo; l'URL assoluto lo compone il renderer. */
  path: string;
  /** Due righe che dicono di cosa parla il pezzo. */
  blurb: string;
  /** Argomento principale, per il raggruppamento visivo. */
  topic: Topic | null;
}

export interface Digest {
  kind: DigestKind;
  /** Estremi della finestra considerata, in ISO. */
  periodStart: string;
  periodEnd: string;
  items: DigestItem[];
  /** Articoli nella finestra che non sono entrati nella selezione. */
  omittedCount: number;
}

/**
 * Numero minimo di articoli perché valga la pena spedire.
 *
 * Una newsletter da due voci consuma la fiducia del lettore più di quanta ne
 * costruisca: meglio saltare l'invio, ed è il motivo per cui `composeDigest`
 * restituisce `null` invece di un digest vuoto.
 */
export const MIN_DIGEST_ITEMS = 3;

/** Voci per invio: sotto si perde rassegna, sopra non si legge. */
const MAX_DIGEST_ITEMS = 8;

/**
 * Articoli ammessi per singolo argomento.
 *
 * Senza questo tetto un giorno di beta produrrebbe un digest fatto di cinque
 * "Apple rilascia la beta di …": tutti pertinenti, e insieme illeggibili. Con due
 * la storia principale conserva il suo spazio senza occupare l'intera rassegna.
 */
const MAX_PER_TOPIC = 2;

export interface ComposeDigestOptions {
  kind?: DigestKind;
  periodStart: Date;
  periodEnd: Date;
  maxItems?: number;
}

/**
 * Compone il digest a partire dagli articoli già ordinati per punteggio.
 *
 * L'ordinamento arriva da `rankHomeItems`: la stessa funzione che compone la
 * home. È una scelta deliberata — se un articolo merita l'apertura del sito
 * merita la prima riga della newsletter, e mantenere due criteri separati
 * significherebbe farli divergere alla prima modifica.
 *
 * Restituisce `null` quando non c'è abbastanza materiale.
 */
export function composeDigest(
  ranked: readonly RankedItem[],
  { kind = "daily", periodStart, periodEnd, maxItems = MAX_DIGEST_ITEMS }: ComposeDigestOptions,
): Digest | null {
  const startMs = periodStart.getTime();
  const endMs = periodEnd.getTime();

  const inWindow = ranked.filter((entry) => {
    const published = new Date(entry.post.date).getTime();
    if (!Number.isFinite(published)) return false;
    return published >= startMs && published <= endMs;
  });

  const perTopic = new Map<string, number>();
  const items: DigestItem[] = [];

  for (const entry of inWindow) {
    if (items.length >= maxItems) break;

    const topic = entry.classification.topics.find(isCorrelatingTopic) ?? null;
    if (topic) {
      const used = perTopic.get(topic.slug) ?? 0;
      if (used >= MAX_PER_TOPIC) continue;
      perTopic.set(topic.slug, used + 1);
    }

    items.push({
      post: entry.post,
      path: `/${getCategoryUrlSlugFromWpSlug(entry.post.categorySlug)}/${entry.post.slug}`,
      blurb: seoDescription(entry.post.excerpt, entry.post.title),
      topic,
    });
  }

  if (items.length < MIN_DIGEST_ITEMS) return null;

  return {
    kind,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    items,
    omittedCount: Math.max(0, inWindow.length - items.length),
  };
}
