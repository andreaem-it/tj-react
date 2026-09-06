import { escapeHtmlAttribute, slugify, stripTags } from "@/lib/content/text";
import type { TocEntry } from "@/lib/content/types";

/**
 * Estrazione dell'indice dei contenuti e iniezione delle ancore.
 *
 * Modulo puro, pensato per girare **una sola volta lato server** per articolo,
 * non a ogni idratazione.
 *
 * Sull'uso di espressioni regolari su HTML: qui l'input non è HTML arbitrario
 * ma output di Gutenberg già passato per `sanitizeRichHtml`, e il compito è
 * circoscritto agli heading di secondo e terzo livello. Introdurre un parser
 * DOM (jsdom, cheerio) per questo significherebbe aggiungere una dipendenza
 * pesante al render server — e in questo progetto `isomorphic-dompurify` è già
 * stato rimosso proprio perché rompeva le lambda Vercel.
 */

/**
 * Sotto questa soglia l'indice non si mostra.
 *
 * Con due voci l'indice occupa più spazio verticale di quanto ne faccia
 * risparmiare, e su mobile spinge il contenuto sotto la prima piega senza dare
 * nulla in cambio.
 */
export const MIN_TOC_ENTRIES = 3;

const HEADING_RE = /<h([23])\b([^>]*)>([\s\S]*?)<\/h\1\s*>/gi;
const ID_ATTR_RE = /\bid\s*=\s*(?:"([^"]*)"|'([^']*)')/i;

export interface TocResult {
  entries: TocEntry[];
  /** HTML identico all'input, con l'attributo `id` aggiunto dove mancava. */
  html: string;
}

/**
 * Costruisce l'indice e garantisce che ogni voce abbia un'ancora raggiungibile.
 *
 * Le ancore vengono iniettate **sempre**, anche quando l'indice non verrà
 * mostrato: sono URL profondi validi che Google può usare per i link "vai alla
 * sezione" nei risultati, e costano un attributo. La decisione se renderizzare
 * l'indice spetta al chiamante, che confronta `entries.length` con
 * `MIN_TOC_ENTRIES`.
 *
 * Un `id` già presente nell'HTML non viene mai riscritto: potrebbe essere il
 * bersaglio di link esistenti, interni o di terzi.
 */
export function buildToc(html: string): TocResult {
  if (!html) return { entries: [], html: "" };

  const entries: TocEntry[] = [];
  const usedIds = new Set<string>();
  let generatedIndex = 0;

  const nextUniqueId = (base: string): string => {
    let candidate = base;
    let suffix = 2;
    while (usedIds.has(candidate)) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
    return candidate;
  };

  const nextHtml = html.replace(
    HEADING_RE,
    (match, levelRaw: string, attrs: string, inner: string) => {
      const text = stripTags(inner);
      // Heading decorativo o vuoto (separatori, immagini dentro un h2): non è
      // una sezione, quindi non finisce nell'indice e non riceve un'ancora.
      if (!text) return match;

      const level = levelRaw === "3" ? 3 : 2;
      const existing = ID_ATTR_RE.exec(attrs);
      const existingId = (existing?.[1] ?? existing?.[2] ?? "").trim();

      if (existingId) {
        usedIds.add(existingId);
        entries.push({ id: existingId, text, level });
        return match;
      }

      generatedIndex += 1;
      const base = slugify(text) || `sezione-${generatedIndex}`;
      const id = nextUniqueId(base);
      usedIds.add(id);
      entries.push({ id, text, level });

      return `<h${level}${attrs} id="${escapeHtmlAttribute(id)}">${inner}</h${level}>`;
    },
  );

  return { entries, html: nextHtml };
}

/** Vero se l'indice ha abbastanza voci da valere lo spazio che occupa. */
export function shouldRenderToc(entries: readonly TocEntry[]): boolean {
  return entries.length >= MIN_TOC_ENTRIES;
}
