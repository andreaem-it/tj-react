/**
 * Converte JSON blocchi BlockNote (formato salvato in precedenza) in HTML semplice
 * per l’editor TipTap. Copre i tipi più usati negli articoli; il resto viene ignorato.
 */

type BNInline =
  | { type: "text"; text?: string; styles?: Record<string, boolean> }
  | { type: "hardBreak" }
  | { type: "link"; href?: string; content?: BNInline[] };

type BNBlock = {
  type: string;
  props?: Record<string, unknown>;
  content?: BNInline[];
  children?: BNBlock[];
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, "&#39;");
}

function applyTextStyles(text: string, styles: Record<string, boolean> | undefined): string {
  if (!styles) return text;
  let t = text;
  if (styles.code) t = `<code>${t}</code>`;
  if (styles.bold) t = `<strong>${t}</strong>`;
  if (styles.italic) t = `<em>${t}</em>`;
  if (styles.underline) t = `<u>${t}</u>`;
  if (styles.strike) t = `<s>${t}</s>`;
  return t;
}

function inlineToHtml(inlines: BNInline[] | undefined): string {
  if (!inlines?.length) return "";
  return inlines
    .map((node) => {
      if (node.type === "hardBreak") return "<br />";
      if (node.type === "text") {
        const raw = escapeHtml(node.text ?? "");
        return applyTextStyles(raw, node.styles);
      }
      if (node.type === "link") {
        const href = escapeAttr(String(node.href ?? "#"));
        const inner = inlineToHtml(node.content);
        return `<a href="${href}" rel="noopener noreferrer">${inner}</a>`;
      }
      return "";
    })
    .join("");
}

function renderLi(block: BNBlock): string {
  const inner = inlineToHtml(block.content);
  const nested = blocksToHtmlSequence(block.children ?? []);
  return `<li>${inner}${nested}</li>`;
}

function takeConsecutive(blocks: BNBlock[], start: number, type: string): { slice: BNBlock[]; next: number } {
  const slice: BNBlock[] = [];
  let i = start;
  while (i < blocks.length && blocks[i].type === type) {
    slice.push(blocks[i]);
    i++;
  }
  return { slice, next: i };
}

/** Sequenza di blocchi (gestisce liste consecutive). */
export function blocksToHtmlSequence(blocks: BNBlock[]): string {
  const parts: string[] = [];
  let i = 0;
  while (i < blocks.length) {
    const b = blocks[i];
    if (b.type === "bulletListItem") {
      const { slice, next } = takeConsecutive(blocks, i, "bulletListItem");
      parts.push(`<ul>${slice.map(renderLi).join("")}</ul>`);
      i = next;
      continue;
    }
    if (b.type === "numberedListItem") {
      const { slice, next } = takeConsecutive(blocks, i, "numberedListItem");
      parts.push(`<ol>${slice.map(renderLi).join("")}</ol>`);
      i = next;
      continue;
    }
    parts.push(singleBlockToHtml(b));
    i++;
  }
  return parts.join("");
}

function singleBlockToHtml(block: BNBlock): string {
  switch (block.type) {
    case "paragraph":
      return `<p>${inlineToHtml(block.content)}</p>`;
    case "heading": {
      const level = Math.min(6, Math.max(1, Number(block.props?.level) || 2));
      return `<h${level}>${inlineToHtml(block.content)}</h${level}>`;
    }
    case "blockquote":
      return `<blockquote>${blocksToHtmlSequence(block.children ?? []) || `<p>${inlineToHtml(block.content)}</p>`}</blockquote>`;
    case "image": {
      const url = escapeAttr(String(block.props?.url ?? block.props?.previewImageUrl ?? ""));
      if (!url) return "";
      const caption = typeof block.props?.caption === "string" ? escapeHtml(block.props.caption) : "";
      const alt = typeof block.props?.name === "string" ? escapeHtml(block.props.name) : "";
      const img = `<img src="${url}" alt="${alt}" class="max-w-full h-auto rounded-lg" loading="lazy" />`;
      return caption ? `<figure>${img}<figcaption>${caption}</figcaption></figure>` : `<p>${img}</p>`;
    }
    case "horizontalRule":
      return "<hr />";
    case "codeBlock": {
      const text = inlineToHtml(block.content) || escapeHtml(String(block.props?.language ?? ""));
      return `<pre><code>${text}</code></pre>`;
    }
    default:
      return "";
  }
}

export function looksLikeBlockNoteJson(s: string): boolean {
  const t = s.trim();
  return t.startsWith("[") && t.includes('"type"');
}

/**
 * Converte JSON BlockNote in HTML. Se il parse fallisce o non è BlockNote, ritorna stringa vuota.
 */
export function legacyBlockNoteToHtml(raw: string): string {
  if (!looksLikeBlockNoteJson(raw)) return "";
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return "";
    const html = blocksToHtmlSequence(parsed as BNBlock[]);
    return html.trim() || "<p></p>";
  } catch {
    return "";
  }
}

/** HTML iniziale editor: converte legacy BlockNote, altrimenti usa il contenuto così com’è (HTML o vuoto). */
export function initialHtmlFromStoredContent(stored: string): string {
  const t = stored.trim();
  if (!t) return "";
  const converted = legacyBlockNoteToHtml(stored);
  if (converted) return converted;
  return stored;
}
