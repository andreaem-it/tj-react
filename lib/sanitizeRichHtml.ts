/**
 * Sanitizza HTML ricco prima di `dangerouslySetInnerHTML`.
 * Solo regex/stringhe — niente jsdom/DOMPurify in SSR (rompeva le lambda Vercel).
 */
export function sanitizeRichHtml(input: string): string {
  if (!input) return "";

  let html = input;

  html = html.replace(/<script\b[\s\S]*?<\/script>/gi, "");
  html = html.replace(/<iframe\b[\s\S]*?<\/iframe>/gi, "");
  html = html.replace(/<object\b[\s\S]*?<\/object>/gi, "");
  html = html.replace(/<embed\b[^>]*>/gi, "");
  html = html.replace(/<link\b[^>]*>/gi, "");
  html = html.replace(/<meta\b[^>]*>/gi, "");
  html = html.replace(/<style\b[\s\S]*?<\/style>/gi, "");
  html = html.replace(/\s(on\w+|formaction|xlink:href)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  html = html.replace(/\b(href|src|action)\s*=\s*("|')\s*javascript:[^"']*\2/gi, "");
  html = html.replace(/javascript:/gi, "");

  return html;
}
