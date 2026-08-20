import { htmlToText } from "@/lib/content/text";
import type { FaqEntry, TocEntry } from "@/lib/content/types";

/**
 * FAQ automatiche da heading già in forma di domanda (§37, §39).
 *
 * Modulo puro. Non genera nessuna domanda: molte guide e confronti pongono
 * già i propri paragrafi come domande dirette ("Quali iPhone supportano iOS
 * 27?", esempio del progetto stesso) perché è il modo naturale di rispondere
 * a un intento di ricerca. Qui ci si limita a riconoscere quegli heading —
 * quelli che finiscono con "?" — e ad associarli a un estratto del testo che
 * li segue.
 *
 * Un articolo senza heading interrogativi non produce alcuna FAQ. Meglio
 * niente che una domanda inventata per riempire una sezione.
 */

/** Sopra questa lunghezza l'estratto smette di essere un riassunto. */
const MAX_ANSWER_CHARS = 280;

/** Oltre queste voci il blocco FAQ diventa un secondo indice, non un aiuto. */
const MAX_FAQ_ENTRIES = 6;

const HEADING_RE = /<h([23])\b([^>]*)>[\s\S]*?<\/h\1\s*>/gi;
const ID_ATTR_RE = /\bid\s*=\s*(?:"([^"]*)"|'([^']*)')/i;

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  // Tronca su un confine di parola quando non perde troppo testo; altrimenti
  // meglio un taglio netto che una parola a metà.
  const base = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${base.trim()}…`;
}

/**
 * Estrae le voci FAQ dall'HTML già dotato di ancore (`buildToc`) e dal
 * relativo indice.
 *
 * Per ogni heading interrogativo, l'answer è il testo fra quell'heading e il
 * successivo (di qualunque livello), convertito in testo semplice e troncato.
 * Non è l'intera sezione: l'ancora (`#id`) resta il collegamento alla
 * risposta completa, la FAQ è solo un riepilogo.
 */
export function extractFaq(html: string, toc: readonly TocEntry[]): FaqEntry[] {
  if (!html || toc.length === 0) return [];

  const questions = toc.filter((entry) => entry.text.trim().endsWith("?"));
  if (questions.length === 0) return [];

  // `headingStart` è l'inizio del tag di apertura (dove inizia la sezione
  // successiva, per il taglio superiore); `contentStart` è la fine del tag di
  // chiusura (`</h2>`/`</h3>`), cioè dove comincia il testo della risposta —
  // non il testo della domanda stessa, che non va ripetuto nell'answer.
  const positions: { id: string; headingStart: number; contentStart: number }[] = [];
  for (const match of html.matchAll(HEADING_RE)) {
    const attrs = match[2] ?? "";
    const idMatch = ID_ATTR_RE.exec(attrs);
    const id = (idMatch?.[1] ?? idMatch?.[2] ?? "").trim();
    if (!id) continue;
    const headingStart = match.index ?? 0;
    positions.push({ id, headingStart, contentStart: headingStart + match[0].length });
  }

  const entries: FaqEntry[] = [];
  for (const question of questions) {
    if (entries.length >= MAX_FAQ_ENTRIES) break;

    const index = positions.findIndex((p) => p.id === question.id);
    if (index === -1) continue;

    const sectionStart = positions[index].contentStart;
    const sectionEnd =
      index + 1 < positions.length ? positions[index + 1].headingStart : html.length;
    const answer = htmlToText(html.slice(sectionStart, sectionEnd));
    if (!answer) continue;

    entries.push({
      id: question.id,
      question: question.text,
      answer: truncate(answer, MAX_ANSWER_CHARS),
    });
  }

  return entries;
}
