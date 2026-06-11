/**
 * Sanitizza HTML ricco prima di `dangerouslySetInnerHTML` (ArticleBody,
 * AuthorCard, IubendaPolicyContent).
 *
 * Usa `sanitize-html` (puro Node, senza jsdom) — `isomorphic-dompurify` rompe
 * le lambda Vercel in SSR (ERR_REQUIRE_ESM su @exodus/bytes).
 *
 * Allowlist coerente con il contenuto WordPress/rich text renderizzato oggi.
 * Nota: `iframe` resta vietato — il sanitizzatore precedente li rimuoveva già.
 */

import sanitizeHtmlLib from "sanitize-html";

const ALLOWED_TAGS = [
  "a", "abbr", "address", "audio", "b", "blockquote", "br", "caption", "cite",
  "code", "col", "colgroup", "dd", "del", "details", "div", "dl", "dt", "em",
  "figcaption", "figure", "h1", "h2", "h3", "h4", "h5", "h6", "hr", "i", "img",
  "ins", "kbd", "li", "mark", "ol", "p", "picture", "pre", "q", "s", "small",
  "source", "span", "strong", "sub", "summary", "sup", "table", "tbody", "td",
  "tfoot", "th", "thead", "time", "tr", "track", "u", "ul", "video", "wbr",
];

/** Attributi globali + data-* WordPress (gallerie, lightbox). */
const GLOBAL_ATTRS = [
  "class", "dir", "id", "lang", "title",
  "data-id", "data-link", "data-src", "data-full-url", "data-caption",
  "data-width", "data-height", "data-attachment-id", "data-permalink",
];

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
function sanitizeSrcset(value: string): string | undefined {
  const candidates = value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .filter((entry) => {
      const url = entry.split(/\s+/)[0];
      return url != null && isSafeUrl(url);
    });
  return candidates.length > 0 ? candidates.join(", ") : undefined;
}

function filterUrlAttribs(attribs: Record<string, string>): Record<string, string> {
  const next = { ...attribs };
  for (const attr of ["href", "src", "poster", "cite"] as const) {
    const value = next[attr];
    if (value != null && !isSafeUrl(value)) {
      delete next[attr];
    }
  }
  const srcset = next.srcset;
  if (srcset != null) {
    const safe = sanitizeSrcset(srcset);
    if (safe == null) {
      delete next.srcset;
    } else {
      next.srcset = safe;
    }
  }
  return next;
}

const SANITIZE_OPTIONS: sanitizeHtmlLib.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    "*": GLOBAL_ATTRS,
    a: ["href", "rel", "target", ...GLOBAL_ATTRS],
    img: ["src", "alt", "srcset", "sizes", "width", "height", "loading", "decoding", ...GLOBAL_ATTRS],
    source: ["src", "srcset", "sizes", "type", "media", ...GLOBAL_ATTRS],
    video: ["src", "poster", "controls", "loop", "muted", "playsinline", "preload", "width", "height", ...GLOBAL_ATTRS],
    audio: ["src", "controls", "loop", "muted", "preload", ...GLOBAL_ATTRS],
    track: ["src", "kind", "srclang", "label", "default", ...GLOBAL_ATTRS],
    td: ["colspan", "rowspan", ...GLOBAL_ATTRS],
    th: ["colspan", "rowspan", "scope", ...GLOBAL_ATTRS],
    col: ["span", ...GLOBAL_ATTRS],
    ol: ["start", "reversed", "type", ...GLOBAL_ATTRS],
    li: ["value", ...GLOBAL_ATTRS],
    time: ["datetime", ...GLOBAL_ATTRS],
    blockquote: ["cite", ...GLOBAL_ATTRS],
    q: ["cite", ...GLOBAL_ATTRS],
  },
  allowedSchemes: ["http", "https"],
  allowedSchemesByTag: {
    img: ["http", "https"],
    source: ["http", "https"],
    video: ["http", "https"],
    audio: ["http", "https"],
    track: ["http", "https"],
  },
  allowProtocolRelative: true,
  disallowedTagsMode: "discard",
  transformTags: {
    a: (tagName, attribs) => {
      const next = filterUrlAttribs(attribs);
      if (next.target === "_blank") {
        next.rel = "noopener noreferrer";
      }
      return { tagName, attribs: next };
    },
    img: (tagName, attribs) => ({ tagName, attribs: filterUrlAttribs(attribs) }),
    source: (tagName, attribs) => ({ tagName, attribs: filterUrlAttribs(attribs) }),
    video: (tagName, attribs) => ({ tagName, attribs: filterUrlAttribs(attribs) }),
    audio: (tagName, attribs) => ({ tagName, attribs: filterUrlAttribs(attribs) }),
    track: (tagName, attribs) => ({ tagName, attribs: filterUrlAttribs(attribs) }),
    blockquote: (tagName, attribs) => ({ tagName, attribs: filterUrlAttribs(attribs) }),
    q: (tagName, attribs) => ({ tagName, attribs: filterUrlAttribs(attribs) }),
  },
};

export function sanitizeRichHtml(input: string): string {
  if (!input) return "";
  return sanitizeHtmlLib(input, SANITIZE_OPTIONS);
}
