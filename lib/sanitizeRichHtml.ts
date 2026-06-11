import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitizza HTML ricco prima di `dangerouslySetInnerHTML` (ArticleBody,
 * AuthorCard, IubendaPolicyContent) con DOMPurify (isomorphic: jsdom in SSR,
 * DOM nativo nel browser).
 *
 * Allowlist coerente con il contenuto WordPress/rich text renderizzato oggi.
 * Nota: `iframe` resta vietato — il sanitizzatore precedente li rimuoveva già,
 * quindi il contenuto attuale non ne fa uso (gli embed video passano da
 * `video`/`figure`, non da iframe YouTube/Vimeo).
 */
const ALLOWED_TAGS = [
  "a", "abbr", "address", "audio", "b", "blockquote", "br", "caption", "cite",
  "code", "col", "colgroup", "dd", "del", "details", "div", "dl", "dt", "em",
  "figcaption", "figure", "h1", "h2", "h3", "h4", "h5", "h6", "hr", "i", "img",
  "ins", "kbd", "li", "mark", "ol", "p", "picture", "pre", "q", "s", "small",
  "source", "span", "strong", "sub", "summary", "sup", "table", "tbody", "td",
  "tfoot", "th", "thead", "time", "tr", "track", "u", "ul", "video", "wbr",
];

const ALLOWED_ATTR = [
  "alt", "cite", "class", "colspan", "controls", "datetime", "decoding", "dir",
  "height", "href", "id", "kind", "label", "lang", "loading", "loop", "media",
  "muted", "playsinline", "poster", "preload", "rel", "reversed", "rowspan",
  "scope", "sizes", "span", "src", "srclang", "srcset", "start", "style",
  "target", "title", "type", "width",
];

/** Attributi che contengono un singolo URL da validare. */
const URL_ATTRIBUTES = ["href", "src", "poster", "cite"] as const;

/** Solo http/https assoluti (inclusi protocol-relative) e path relativi. */
function isSafeUrl(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  try {
    const u = new URL(v, "https://relative-base.invalid");
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Filtra le candidate di un `srcset` mantenendo solo URL sicuri. */
function sanitizeSrcset(value: string): string | null {
  const candidates = value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .filter((entry) => {
      const url = entry.split(/\s+/)[0];
      return url != null && isSafeUrl(url);
    });
  return candidates.length > 0 ? candidates.join(", ") : null;
}

DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  // Duck-typing (no `instanceof Element`): in SSR il DOM è quello di jsdom e
  // `Element` non esiste come global di Node.
  const el = node as Element;
  if (typeof el.getAttribute !== "function") return;

  for (const attr of URL_ATTRIBUTES) {
    const value = el.getAttribute(attr);
    if (value != null && !isSafeUrl(value)) {
      el.removeAttribute(attr);
    }
  }

  const srcset = el.getAttribute("srcset");
  if (srcset != null) {
    const safe = sanitizeSrcset(srcset);
    if (safe == null) {
      el.removeAttribute("srcset");
    } else if (safe !== srcset) {
      el.setAttribute("srcset", safe);
    }
  }

  // Hardening dei link che aprono nuove schede (reverse tabnabbing).
  if (el.tagName === "A" && el.getAttribute("target") === "_blank") {
    el.setAttribute("rel", "noopener noreferrer");
  }
});

export function sanitizeRichHtml(input: string): string {
  if (!input) return "";

  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // I data-* di WordPress (gallerie, lightbox) sono innocui e usati nel markup.
    ALLOW_DATA_ATTR: true,
    // Difesa aggiuntiva oltre all'hook: solo http/https espliciti oppure URL
    // senza schema (path relativi, protocol-relative, #anchor, ?query).
    // Vieta javascript:, data:, vbscript:, file:, blob:, mailto:, ecc.
    ALLOWED_URI_REGEXP: /^(?:https?:|(?![a-z][a-z0-9+.-]*:))/i,
  });
}
