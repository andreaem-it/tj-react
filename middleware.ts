import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const DEPLOY_LAST_MODIFIED = new Date().toUTCString();

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
  const accept = request.headers.get("accept");
  return typeof accept === "string" && accept.includes("text/markdown");
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

function appendAgentLinkHeaders(response: NextResponse): void {
  response.headers.append("Link", '</api>; rel="service-desc"');
  response.headers.append("Link", '</docs>; rel="service-doc"');
  response.headers.append("Link", '</.well-known/api-catalog>; rel="api-catalog"');
  response.headers.append(
    "Link",
    '</.well-known/oauth-authorization-server>; rel="oauth2-metadata"'
  );
  response.headers.append(
    "Link",
    '</.well-known/openid-configuration>; rel="openid-configuration"'
  );
  response.headers.append(
    "Link",
    '</.well-known/oauth-protected-resource>; rel="oauth-protected-resource"'
  );
  response.headers.append(
    "Link",
    '</.well-known/mcp/server-card.json>; rel="mcp-server-card"'
  );
}

function appendFreshnessHeaders(response: NextResponse): void {
  if (!response.headers.has("Last-Modified")) {
    response.headers.set("Last-Modified", DEPLOY_LAST_MODIFIED);
  }
}

function appendSecurityHeaders(response: NextResponse): void {
  response.headers.set("Content-Security-Policy", "frame-ancestors 'none'");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isInvalidSitemapPath(pathname)) {
    const response = new NextResponse("Not Found", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
    appendSecurityHeaders(response);
    return response;
  }

  if (isInvalidWellKnownPath(pathname)) {
    const response = new NextResponse("Not Found", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
    appendSecurityHeaders(response);
    return response;
  }

  if (wantsMarkdown(request)) {
    const article = looksLikeArticlePath(pathname);
    if (article) {
      const markdownUrl = request.nextUrl.clone();
      markdownUrl.pathname = "/api/markdown-article";
      markdownUrl.searchParams.set("category", article.category);
      markdownUrl.searchParams.set("slug", article.articleSlug);
      const response = NextResponse.rewrite(markdownUrl);
      appendSecurityHeaders(response);
      return response;
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
      const response = NextResponse.rewrite(markdownUrl);
      appendSecurityHeaders(response);
      return response;
    }
  }

  const response = NextResponse.next();
  appendSecurityHeaders(response);
  appendAgentLinkHeaders(response);
  appendFreshnessHeaders(response);

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt).*)"],
};
