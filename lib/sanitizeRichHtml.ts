const BLOCKED_CONTAINER_TAGS = [
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "link",
  "meta",
  "base",
] as const;

const BLOCKED_INLINE_TAGS = ["script", "iframe", "object", "embed", "link", "meta", "base"] as const;

const containerPattern = new RegExp(
  `<(${BLOCKED_CONTAINER_TAGS.join("|")})(?:\\s[^>]*)?>[\\s\\S]*?<\\/\\1>`,
  "gi",
);
const inlinePattern = new RegExp(`<(${BLOCKED_INLINE_TAGS.join("|")})[^>]*\\/?>`, "gi");
const eventHandlerPattern = /\son[a-z0-9_-]+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi;
const jsProtocolPattern = /\s(href|src)\s*=\s*("javascript:[^"]*"|'javascript:[^']*'|javascript:[^\s>]+)/gi;
const htmlDataUriPattern =
  /\s(href|src)\s*=\s*("data:text\/html[^"]*"|'data:text\/html[^']*'|data:text\/html[^\s>]*)/gi;
const srcDocPattern = /\ssrcdoc\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi;

export function sanitizeRichHtml(input: string): string {
  if (!input) return "";
  return input
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(containerPattern, "")
    .replace(inlinePattern, "")
    .replace(eventHandlerPattern, "")
    .replace(jsProtocolPattern, "")
    .replace(htmlDataUriPattern, "")
    .replace(srcDocPattern, "");
}
