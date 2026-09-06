import { findFirstMention } from "@/lib/content/match";
import { topicHref } from "@/lib/content/topics";
import { escapeHtmlAttribute } from "@/lib/content/text";
import type { Topic } from "@/lib/content/types";

/**
 * Internal linking automatico e vincolato (§27).
 *
 * Collega la prima menzione di un'entità alla sua pagina, con quattro limiti
 * che esistono per non trasformare l'articolo in un tappeto di link:
 *
 * 1. al massimo `MAX_INTERNAL_LINKS` link per articolo;
 * 2. al massimo uno per entità (la prima occorrenza);
 * 3. al massimo uno per blocco di testo, così due link non finiscono nello
 *    stesso paragrafo;
 * 4. mai dentro un link esistente, un heading, una citazione o del codice.
 *
 * L'ultimo punto è quello che rende l'operazione sicura, ed è anche il motivo
 * per cui non basta una `String.replace`: sostituire "iPhone 18" nel testo
 * grezzo produrrebbe `<a href="…"><a href="…">iPhone 18</a></a>` dentro i link
 * già presenti e riscriverebbe il testo delle citazioni altrui.
 */

/** Tetto ai link inseriti automaticamente in un articolo. */
export const MAX_INTERNAL_LINKS = 3;

/** Classe applicata ai link generati, per poterli distinguere e stilizzare. */
export const INTERNAL_LINK_CLASS = "tj-entity-link";

/**
 * Contesti in cui non si inserisce mai un link.
 *
 * `blockquote` e `q` sono nell'elenco per una ragione editoriale e non tecnica:
 * sono parole di qualcun altro, e aggiungerci dentro un rimando è una modifica
 * alla citazione.
 */
const NO_LINK_TAGS = new Set([
  "a",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "pre",
  "code",
  "kbd",
  "blockquote",
  "q",
  "figcaption",
  "table",
]);

/** Tag che aprono un nuovo blocco di testo, ai fini del limite "uno per blocco". */
const BLOCK_TAGS = new Set([
  "p",
  "li",
  "div",
  "td",
  "th",
  "section",
  "article",
  "figure",
  "dd",
  "dt",
]);

/** Tag senza contenuto: non aprono né chiudono un contesto. */
const VOID_TAGS = new Set([
  "br",
  "img",
  "hr",
  "col",
  "source",
  "track",
  "wbr",
  "input",
  "meta",
  "link",
]);

const TAG_RE = /^<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)/;


export interface InternalLinkResult {
  html: string;
  /** Entità effettivamente collegate, nell'ordine di inserimento. */
  linked: Topic[];
}

export interface InternalLinkOptions {
  /**
   * Percorsi da non collegare.
   *
   * Serve per l'archivio della categoria dell'articolo, che l'intestazione
   * della pagina linka già due volte (occhiello e breadcrumb): un terzo
   * rimando nel corpo non aggiunge navigazione, solo rumore.
   */
  skipHrefs?: readonly string[];
  maxLinks?: number;
}

interface LinkCandidate {
  topic: Topic;
  href: string;
}

/**
 * Un pezzo di HTML, classificato.
 *
 * `block` è l'indice del blocco di testo a cui il token appartiene, e serve al
 * limite "un link per paragrafo". `linkable` è falso per i tag e per il testo
 * che si trova dentro un contesto vietato.
 */
interface Token {
  value: string;
  linkable: boolean;
  block: number;
}

/**
 * Spezza l'HTML in token, tenendo traccia di contesto vietato e confini di
 * blocco.
 *
 * È una singola passata lineare: non costruisce un albero, perché per decidere
 * "questo testo è collegabile e appartiene a questo paragrafo" bastano due
 * contatori.
 */
function tokenize(html: string): Token[] {
  const tokens: Token[] = [];
  let noLinkDepth = 0;
  let block = 0;
  let cursor = 0;

  while (cursor < html.length) {
    const lt = html.indexOf("<", cursor);
    if (lt === -1) {
      tokens.push({ value: html.slice(cursor), linkable: noLinkDepth === 0, block });
      break;
    }
    if (lt > cursor) {
      tokens.push({ value: html.slice(cursor, lt), linkable: noLinkDepth === 0, block });
    }

    const gt = html.indexOf(">", lt);
    if (gt === -1) {
      // Tag non chiuso: il residuo si copia così com'è, senza inventare nulla.
      tokens.push({ value: html.slice(lt), linkable: false, block });
      break;
    }

    const tag = html.slice(lt, gt + 1);
    const parsed = TAG_RE.exec(tag);
    if (parsed) {
      const closing = parsed[1] === "/";
      const name = parsed[2].toLowerCase();
      const selfClosing = VOID_TAGS.has(name) || /\/\s*>$/.test(tag);

      if (NO_LINK_TAGS.has(name) && !selfClosing) {
        noLinkDepth = closing ? Math.max(0, noLinkDepth - 1) : noLinkDepth + 1;
      }
      // Apertura e chiusura contano entrambe come confine: `</p><p>` sono due
      // eventi, e incrementare due volte è innocuo perché l'indice serve solo a
      // distinguere blocchi, non a numerarli.
      if (BLOCK_TAGS.has(name)) block += 1;
    }

    tokens.push({ value: tag, linkable: false, block });
    cursor = gt + 1;
  }

  return tokens;
}

/**
 * Inserisce i link interni nell'HTML dell'articolo.
 *
 * `entities` va passato già ordinato per rilevanza (`matchTopics` lo fa).
 *
 * ## La decisione si prende per blocco, non per tratto di testo
 *
 * Gli hub hanno la precedenza sugli archivi di categoria. Su un articolo reale
 * il primo paragrafo era:
 *
 * > "Apple ha risolto la causa sui ritardi di &lt;strong&gt;Siri&lt;/strong&gt; e di
 * > &lt;strong&gt;Apple Intelligence&lt;/strong&gt;."
 *
 * "Apple" è l'unica entità del primo tratto di testo: i due hub stanno dentro
 * `<strong>`, cioè in tratti separati dello stesso paragrafo. Un algoritmo che
 * scegliesse il link tratto per tratto avrebbe collegato "Apple" — l'unico
 * candidato disponibile lì — e la regola "un link per blocco" avrebbe poi
 * escluso Siri e Apple Intelligence. Il budget speso sul link meno utile della
 * pagina, per un dettaglio di markup.
 *
 * Valutando il paragrafo nel suo insieme la scelta diventa indipendente da dove
 * il markup interrompe il testo: vince prima chi ha un hub, poi chi compare
 * prima.
 *
 * `/apple` come rimando nel corpo aggiunge poco — è già nel menu principale,
 * nell'occhiello e nel breadcrumb. Un hub no: nessun altro elemento della pagina
 * porta lì.
 */
export function injectInternalLinks(
  html: string,
  entities: readonly Topic[],
  options: InternalLinkOptions = {},
): InternalLinkResult {
  const maxLinks = options.maxLinks ?? MAX_INTERNAL_LINKS;
  if (!html || maxLinks <= 0) return { html, linked: [] };

  const skip = new Set(options.skipHrefs ?? []);
  const pending = new Map<string, LinkCandidate>();
  for (const topic of entities) {
    const href = topicHref(topic);
    if (!href || skip.has(href)) continue;
    // Se l'articolo linka già quella pagina — a mano o in un altro punto — non
    // se ne aggiunge un secondo.
    if (html.includes(`href="${href}"`) || html.includes(`href='${href}'`)) continue;
    pending.set(topic.slug, { topic, href });
  }
  if (pending.size === 0) return { html, linked: [] };

  const tokens = tokenize(html);
  const linked: Topic[] = [];

  // I token collegabili, raggruppati per blocco e in ordine di documento: i
  // paragrafi iniziali hanno diritto di prelazione sul budget, così i rimandi
  // compaiono dove il lettore arriva prima.
  const blocks = new Map<number, number[]>();
  tokens.forEach((token, index) => {
    if (!token.linkable || !token.value.trim()) return;
    const list = blocks.get(token.block);
    if (list) list.push(index);
    else blocks.set(token.block, [index]);
  });

  for (const tokenIndexes of blocks.values()) {
    if (linked.length >= maxLinks || pending.size === 0) break;

    let best: {
      slug: string;
      tokenIndex: number;
      start: number;
      length: number;
      rank: number;
      order: number;
    } | null = null;

    for (const [slug, candidate] of pending) {
      // `hub === false` = destinazione d'archivio: si considera solo se in questo
      // blocco non c'è alcun hub da collegare.
      const rank = candidate.topic.hub === false ? 1 : 0;
      for (let position = 0; position < tokenIndexes.length; position += 1) {
        const tokenIndex = tokenIndexes[position];
        const mention = findFirstMention(tokens[tokenIndex].value, candidate.topic);
        if (!mention) continue;
        const contender = {
          slug,
          tokenIndex,
          start: mention.index,
          length: mention.length,
          rank,
          order: position,
        };
        if (best === null || isBetter(contender, best)) best = contender;
        break;
      }
    }

    if (best === null) continue;

    const candidate = pending.get(best.slug)!;
    pending.delete(best.slug);
    linked.push(candidate.topic);

    const token = tokens[best.tokenIndex];
    const label = token.value.slice(best.start, best.start + best.length);
    token.value =
      token.value.slice(0, best.start) +
      `<a href="${escapeHtmlAttribute(candidate.href)}" class="${INTERNAL_LINK_CLASS}">${label}</a>` +
      token.value.slice(best.start + best.length);
  }

  return { html: tokens.map((token) => token.value).join(""), linked };
}

/**
 * Ordine di preferenza dentro un blocco: prima l'hub, poi chi compare prima nel
 * testo, poi l'alias più lungo.
 *
 * L'ultimo criterio serve al caso "Apple Watch Ultra", dove due entità partono
 * dallo stesso carattere: si collega l'etichetta più specifica.
 */
function isBetter(
  a: { rank: number; order: number; start: number; length: number },
  b: { rank: number; order: number; start: number; length: number },
): boolean {
  if (a.rank !== b.rank) return a.rank < b.rank;
  if (a.order !== b.order) return a.order < b.order;
  if (a.start !== b.start) return a.start < b.start;
  return a.length > b.length;
}
