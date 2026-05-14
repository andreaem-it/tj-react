import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitizza HTML ricco (articoli, policy embed) prima di `dangerouslySetInnerHTML`.
 * DOMPurify con profilo HTML riduce il rischio XSS rispetto ai soli regex.
 */
export function sanitizeRichHtml(input: string): string {
  if (!input) return "";
  return DOMPurify.sanitize(input, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ["target"],
  });
}
