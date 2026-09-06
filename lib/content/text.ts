/**
 * Utility di testo per il knowledge layer.
 *
 * Puro, senza dipendenze e senza I/O: gira sia nel render server sia nei test
 * (`node --test`), e resta l'unico posto dove si decide come si conta una parola
 * o come si costruisce uno slug.
 */

/** Entità HTML nominate che compaiono davvero nel contenuto WordPress italiano. */
const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  // Spazi tipografici Gutenberg: senza la conversione a spazio normale
  // finirebbero attaccati alle parole adiacenti falsando il conteggio.
  ensp: " ",
  emsp: " ",
  thinsp: " ",
  hellip: "…",
  ndash: "–",
  mdash: "—",
  laquo: "«",
  raquo: "»",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  agrave: "à",
  egrave: "è",
  eacute: "é",
  igrave: "ì",
  ograve: "ò",
  ugrave: "ù",
  Agrave: "À",
  Egrave: "È",
  Eacute: "É",
  Igrave: "Ì",
  Ograve: "Ò",
  Ugrave: "Ù",
  euro: "€",
  deg: "°",
  copy: "©",
  reg: "®",
  trade: "™",
  times: "×",
};

/** Decodifica entità nominate e numeriche (decimali ed esadecimali). */
export function decodeHtmlEntities(input: string): string {
  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (match, body: string) => {
    if (body.startsWith("#")) {
      const isHex = body[1] === "x" || body[1] === "X";
      const code = Number.parseInt(isHex ? body.slice(2) : body.slice(1), isHex ? 16 : 10);
      // Fuori dal piano Unicode valido: si lascia il testo originale invece di
      // far lanciare `fromCodePoint`.
      if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return match;
      try {
        return String.fromCodePoint(code);
      } catch {
        return match;
      }
    }
    return NAMED_ENTITIES[body] ?? match;
  });
}

/**
 * HTML → testo semplice.
 *
 * `script`, `style` e `figcaption` vengono rimossi **con il loro contenuto**:
 * i primi due non sono testo, la didascalia sì ma non è prosa dell'articolo e
 * gonfierebbe il tempo di lettura di ogni pezzo con molte immagini.
 */
export function htmlToText(html: string): string {
  if (!html) return "";
  return decodeHtmlEntities(
    html
      .replace(/<(script|style|figcaption)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
      // I tag di blocco diventano confine di parola: senza, `<p>uno</p><p>due</p>`
      // darebbe "unodue", una parola invece di due.
      .replace(/<\/?(?:p|div|br|li|tr|td|th|h[1-6]|blockquote|figure|section|ul|ol|table|pre)\b[^>]*>/gi, " ")
      .replace(/<[^>]*>/g, ""),
  )
    .replace(/\s+/g, " ")
    .trim();
}

/** Rimuove i tag mantenendo il testo, senza normalizzare gli spazi interni. */
export function stripTags(html: string): string {
  return decodeHtmlEntities(html.replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim();
}

/**
 * Conteggio parole.
 *
 * Divide su spazi e punteggiatura di separazione, non su tutto ciò che non è
 * lettera: "iPhone 18 Pro" sono tre parole, "USB-C" e "Wi-Fi" una ciascuna.
 */
export function countWords(text: string): number {
  const normalized = text.trim();
  if (!normalized) return 0;
  // `\s` in JavaScript comprende gia U+00A0, quindi anche gli spazi non
  // separabili sopravvissuti alla decodifica separano correttamente.
  return normalized.split(/\s+/).filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
}

/**
 * Slug per ancore e URL.
 *
 * NFD + rimozione dei segni diacritici: "Compatibilità" → "compatibilita",
 * coerente con gli slug WordPress italiani già in uso.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

/**
 * Escape per inserire una stringa arbitraria in una `RegExp`.
 *
 * Indispensabile per gli alias del registry: "iOS 26.6.1" senza escape
 * matcherebbe anche "iOS 26x6y1", e "C++" farebbe lanciare il costruttore.
 */
export function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Escape del testo destinato ad attributi HTML generati lato server. */
export function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
