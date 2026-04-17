const TAG_REPLACEMENTS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /<\s*br\s*\/?>/gi, replacement: "\n" },
  { pattern: /<\s*\/p\s*>/gi, replacement: "\n\n" },
  { pattern: /<\s*p[^>]*>/gi, replacement: "" },
  { pattern: /<\s*\/h1\s*>/gi, replacement: "\n\n" },
  { pattern: /<\s*h1[^>]*>/gi, replacement: "# " },
  { pattern: /<\s*\/h2\s*>/gi, replacement: "\n\n" },
  { pattern: /<\s*h2[^>]*>/gi, replacement: "## " },
  { pattern: /<\s*\/h3\s*>/gi, replacement: "\n\n" },
  { pattern: /<\s*h3[^>]*>/gi, replacement: "### " },
  { pattern: /<\s*\/li\s*>/gi, replacement: "\n" },
  { pattern: /<\s*li[^>]*>/gi, replacement: "- " },
  { pattern: /<\s*\/ul\s*>/gi, replacement: "\n" },
  { pattern: /<\s*ul[^>]*>/gi, replacement: "\n" },
  { pattern: /<\s*\/ol\s*>/gi, replacement: "\n" },
  { pattern: /<\s*ol[^>]*>/gi, replacement: "\n" },
  { pattern: /<\s*\/strong\s*>/gi, replacement: "**" },
  { pattern: /<\s*strong[^>]*>/gi, replacement: "**" },
  { pattern: /<\s*\/b\s*>/gi, replacement: "**" },
  { pattern: /<\s*b[^>]*>/gi, replacement: "**" },
  { pattern: /<\s*\/em\s*>/gi, replacement: "_" },
  { pattern: /<\s*em[^>]*>/gi, replacement: "_" },
  { pattern: /<\s*\/i\s*>/gi, replacement: "_" },
  { pattern: /<\s*i[^>]*>/gi, replacement: "_" },
  { pattern: /<\s*\/blockquote\s*>/gi, replacement: "\n" },
  { pattern: /<\s*blockquote[^>]*>/gi, replacement: "> " },
];

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export function htmlToMarkdown(html: string): string {
  if (!html.trim()) return "";

  let markdown = html;

  markdown = markdown.replace(
    /<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi,
    (_match, href: string, text: string) => `[${text.replace(/<[^>]+>/g, "").trim()}](${href})`
  );

  for (const replacement of TAG_REPLACEMENTS) {
    markdown = markdown.replace(replacement.pattern, replacement.replacement);
  }

  markdown = markdown.replace(/<[^>]+>/g, "");
  markdown = decodeHtmlEntities(markdown);

  markdown = markdown
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();

  return markdown;
}
