import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const VALID_SITEMAP_PATHS = new Set(["/sitemap.xml"]);
const VALID_WELL_KNOWN_PATHS = new Set([
  "/.well-known/api-catalog",
  "/.well-known/agent-skills/index.json",
  "/.well-known/agent.json",
  "/.well-known/webmcp.json",
  "/.well-known/webmcp",
  "/.well-known/mcp.json",
  "/.well-known/mcp",
  "/.well-known/mcp-discovery",
  "/.well-known/mcp/server-card.json",
  "/.well-known/openid-configuration",
  "/.well-known/oauth-authorization-server",
  "/.well-known/oauth-protected-resource",
  "/.well-known/agents.json",
  "/.well-known/llms.txt",
]);

const EXCLUDED_MARKDOWN_PREFIXES = new Set([
  "api",
  "_next",
  "price-radar",
  "category",
  "compatibility",
]);

function isInvalidSitemapPath(pathname: string): boolean {
  if (VALID_SITEMAP_PATHS.has(pathname)) return false;
  return /^\/sitemap(?:[a-z0-9._-]*)\.(?:xml|xml\.gz)$/i.test(pathname);
}

function isInvalidWellKnownPath(pathname: string): boolean {
  if (!pathname.startsWith("/.well-known")) return false;
  return !VALID_WELL_KNOWN_PATHS.has(pathname);
}

function wantsMarkdown(request: NextRequest): boolean {
  if (request.headers.get("x-skip-markdown-rewrite") === "1") return false;
  return request.headers.get("x-agent-markdown") === "1";
}

function looksLikeArticlePath(pathname: string): { category: string; articleSlug: string } | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length !== 2) return null;

  const [category, articleSlug] = parts;
  if (!category || !articleSlug) return null;
  if (EXCLUDED_MARKDOWN_PREFIXES.has(category.toLowerCase())) return null;
  if (articleSlug.toLowerCase() === "reader") return null;
  if (/\.[a-z0-9]+$/i.test(category) || /\.[a-z0-9]+$/i.test(articleSlug)) return null;

  return { category, articleSlug };
}

/**
 * Rewrite markdown solo per agenti (header esplicito).
 * Gli header di sicurezza/agent sono in next.config.ts — non in middleware.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isInvalidSitemapPath(pathname)) {
    return new NextResponse("Not Found", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  if (isInvalidWellKnownPath(pathname)) {
    return new NextResponse("Not Found", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  if (!wantsMarkdown(request)) {
    return NextResponse.next();
  }

  const article = looksLikeArticlePath(pathname);
  if (article) {
    const markdownUrl = request.nextUrl.clone();
    markdownUrl.pathname = "/api/markdown-article";
    markdownUrl.searchParams.set("category", article.category);
    markdownUrl.searchParams.set("slug", article.articleSlug);
    return NextResponse.rewrite(markdownUrl);
  }

  const isPageLikePath =
    pathname !== "/favicon.ico" &&
    !pathname.startsWith("/_next/") &&
    !pathname.startsWith("/api/") &&
    !/\.[a-z0-9]+$/i.test(pathname);

  if (isPageLikePath) {
    const markdownUrl = request.nextUrl.clone();
    markdownUrl.pathname = "/api/markdown-page";
    markdownUrl.searchParams.set("path", pathname);
    return NextResponse.rewrite(markdownUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * NON eseguire middleware su /categoria/articolo (due segmenti).
     * In produzione (Vercel + Cloudflare) la combo middleware + ISR articoli
     * causava 500 su tutte le pagine articolo.
     */
    "/((?!_next/static|_next/image|favicon.ico|robots\\.txt|sitemap\\.xml|ads\\.txt|feed\\.xml|llms\\.txt|manifest\\.webmanifest|.*\\.webmanifest|.*\\.(?:svg|png|jpe?g|gif|webp|ico|woff2?)|[^/]+/[^/]+(?:/reader)?).*)",
  ],
};
