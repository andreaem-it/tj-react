import { TOPICS } from "@/lib/content/topics";
import { escapeRegExp, htmlToText } from "@/lib/content/text";
import type { Topic, TopicAlias, TopicMatch } from "@/lib/content/types";

/**
 * Matching deterministico dei topic sul testo di un articolo.
 *
 * Modulo puro: nessun I/O, nessuna dipendenza da Next. È l'unico posto dove si
 * decide se un articolo "parla di" un argomento, quindi è anche l'unico posto
 * da guardare quando un'assegnazione sembra sbagliata.
 */

/** Numero massimo di topic mostrati come argomenti principali di un articolo. */
export const MAX_PRIMARY_TOPICS = 4;

/**
 * Occorrenze nel corpo oltre le quali il segnale non cresce più.
 *
 * Senza tetto, un articolo che ripete "Apple" trenta volte avrebbe `apple` come
 * argomento principale davanti a `iOS 27` citato nel titolo — che è l'inverso
 * della realtà editoriale.
 */
const CONTENT_HITS_CAP = 6;

const TITLE_WEIGHT = 10;
const EXCERPT_WEIGHT = 3;
const CONTENT_WEIGHT = 1;

/** Occorrenze minime nel solo corpo per considerare un argomento trattato. */
const MIN_CONTENT_HITS = 2;

interface AliasPattern {
  regex: RegExp;
}

/**
 * Le lookaround su lettere/cifre Unicode, e non `\b`, perché `\b` in JavaScript
 * ragiona su `[A-Za-z0-9_]`: dopo "iOS" in "iOSè" vedrebbe un confine di parola
 * (la "è" non è ASCII) e produrrebbe un falso positivo su testo italiano.
 */
function buildAliasRegex(text: string, matchCase: boolean): RegExp {
  const flags = matchCase ? "gu" : "giu";
  return new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(text)}(?![\\p{L}\\p{N}])`, flags);
}

/**
 * Cache dei pattern per topic.
 *
 * Il registry è costante, quindi si compila una volta per processo: senza
 * cache si ricostruirebbero ~90 `RegExp` per ogni articolo renderizzato.
 */
const PATTERNS: Map<string, AliasPattern[]> = new Map(
  TOPICS.map((topic) => [
    topic.slug,
    topic.aliases.map((alias: TopicAlias) =>
      typeof alias === "string"
        ? { regex: buildAliasRegex(alias, false) }
        : { regex: buildAliasRegex(alias.text, true) },
    ),
  ]),
);

/**
 * Numero di menzioni distinte di un topic in un testo.
 *
 * Non è la somma delle occorrenze dei singoli alias: in "Apple Watch Ultra" gli
 * alias "Apple Watch" e "Watch Ultra" colpiscono entrambi, ma la menzione è una.
 * Si contano quindi i gruppi di corrispondenze sovrapposte, non le
 * corrispondenze.
 */
function countMentions(text: string, patterns: AliasPattern[]): number {
  if (!text) return 0;
  const spans: Array<[number, number]> = [];
  for (const { regex } of patterns) {
    // `matchAll` richiede il flag `g` (presente) e non risente di `lastIndex`
    // residuo: crea un iteratore su una copia interna del pattern.
    for (const m of text.matchAll(regex)) {
      if (m.index === undefined) continue;
      spans.push([m.index, m.index + m[0].length]);
    }
  }
  if (spans.length === 0) return 0;
  spans.sort((a, b) => a[0] - b[0] || a[1] - b[1]);

  let mentions = 1;
  let currentEnd = spans[0][1];
  for (let i = 1; i < spans.length; i += 1) {
    const [start, end] = spans[i];
    if (start >= currentEnd) {
      mentions += 1;
      currentEnd = end;
    } else if (end > currentEnd) {
      currentEnd = end;
    }
  }
  return mentions;
}

/** Testi di un articolo su cui il matcher lavora. */
export interface MatchInput {
  title: string;
  excerpt?: string;
  /** Corpo dell'articolo. Accetta HTML: viene ridotto a testo internamente. */
  content?: string;
  /** Corpo già in testo semplice, se il chiamante lo ha calcolato. */
  contentText?: string;
}

/**
 * Topic rilevati, ordinati per rilevanza decrescente.
 *
 * Un argomento è considerato trattato se compare nel titolo o nell'excerpt
 * (una volta basta: sono spazi in cui nulla finisce per caso) oppure almeno
 * `MIN_CONTENT_HITS` volte nel corpo. La singola menzione di passaggio nel
 * corpo non basta, altrimenti ogni articolo che nomina "Samsung" in una
 * subordinata risulterebbe un articolo su Samsung.
 */
export function matchTopics(input: MatchInput): TopicMatch[] {
  const texts = normalizeInput(input);
  const matches: TopicMatch[] = [];
  for (const topic of TOPICS) {
    const match = evaluateTopic(topic, texts);
    if (match) matches.push(match);
  }
  return matches.sort((a, b) => b.score - a.score || a.topic.slug.localeCompare(b.topic.slug));
}

interface NormalizedTexts {
  title: string;
  excerpt: string;
  contentText: string;
}

function normalizeInput(input: MatchInput): NormalizedTexts {
  return {
    title: input.title ?? "",
    excerpt: input.excerpt ?? "",
    contentText: input.contentText ?? (input.content ? htmlToText(input.content) : ""),
  };
}

function evaluateTopic(topic: Topic, texts: NormalizedTexts): TopicMatch | null {
  const patterns = PATTERNS.get(topic.slug);
  if (!patterns || patterns.length === 0) return null;

  const titleHits = countMentions(texts.title, patterns);
  const excerptHits = countMentions(texts.excerpt, patterns);
  const contentHits = countMentions(texts.contentText, patterns);

  if (!(titleHits > 0 || excerptHits > 0 || contentHits >= MIN_CONTENT_HITS)) return null;

  return {
    topic,
    score:
      titleHits * TITLE_WEIGHT +
      excerptHits * EXCERPT_WEIGHT +
      Math.min(contentHits, CONTENT_HITS_CAP) * CONTENT_WEIGHT,
    inTitle: titleHits > 0,
    hits: titleHits + excerptHits + contentHits,
  };
}

/**
 * Argomenti principali: i match ripuliti dalle generalizzazioni.
 *
 * Se un articolo parla di `iOS 27`, ha necessariamente colpito anche `iOS`.
 * Mostrare entrambi sprecherebbe una chip su un'informazione già implicata,
 * quindi ogni topic che sia `parent` di un altro match viene rimosso. Il taglio
 * a `MAX_PRIMARY_TOPICS` arriva dopo, così i posti disponibili vanno agli
 * argomenti specifici.
 */
export function primaryTopics(
  matches: TopicMatch[],
  limit = MAX_PRIMARY_TOPICS,
): Topic[] {
  const impliedParents = new Set<string>();
  for (const { topic } of matches) {
    if (topic.parent) impliedParents.add(topic.parent);
  }
  return matches
    .filter(({ topic }) => !impliedParents.has(topic.slug))
    .slice(0, limit)
    .map(({ topic }) => topic);
}

/** Posizione di una menzione nel testo. */
export interface Mention {
  index: number;
  length: number;
}

/**
 * Prima menzione di un topic in un testo, o `null`.
 *
 * Serve all'internal linking, che deve collegare la prima occorrenza e sapere
 * esattamente quali caratteri sostituire. Vive qui e non in
 * `lib/content/internalLinks.ts` perché è l'unico modulo che conosce le regole
 * di confronto degli alias: duplicarle altrove significherebbe poterle far
 * divergere.
 *
 * A parità di posizione vince l'alias più lungo: in "Apple Watch Ultra" si
 * collega "Apple Watch", non "Apple".
 */
export function findFirstMention(text: string, topic: Topic): Mention | null {
  const patterns = PATTERNS.get(topic.slug);
  if (!patterns || !text) return null;

  let best: Mention | null = null;
  for (const { regex } of patterns) {
    for (const m of text.matchAll(regex)) {
      if (m.index === undefined) continue;
      const candidate: Mention = { index: m.index, length: m[0].length };
      if (
        best === null ||
        candidate.index < best.index ||
        (candidate.index === best.index && candidate.length > best.length)
      ) {
        best = candidate;
      }
      // `matchAll` procede in ordine crescente di indice: la prima
      // corrispondenza di questo alias è già la migliore che possa offrire.
      break;
    }
  }
  return best;
}

/**
 * Vero se l'articolo tratta il topic indicato.
 *
 * Usato dagli hub per filtrare i risultati della ricerca WordPress, che è
 * generosa: la query "iOS 27" restituisce anche articoli che citano "iOS" e
 * "27" in punti diversi del testo.
 *
 * Valuta il solo topic richiesto invece di passare da `matchTopics`: un hub
 * filtra decine di risultati e non ha alcun motivo di calcolare il grafo
 * completo per ciascuno.
 */
export function matchesTopic(input: MatchInput, topic: Topic): boolean {
  return evaluateTopic(topic, normalizeInput(input)) !== null;
}
