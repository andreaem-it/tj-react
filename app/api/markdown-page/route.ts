import { NextResponse } from "next/server";
import { estimateMarkdownTokens, htmlToMarkdown } from "@/lib/markdown";

export const revalidate = 300;

const MARKDOWN_CACHE_CONTROL =
  "public, s-maxage=300, stale-while-revalidate=86400";
const UPSTREAM_TIMEOUT_MS = 8_000;
const MAX_UPSTREAM_HTML_BYTES = 2 * 1024 * 1024;

function stripNonContentTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "");
}

function extractMainHtml(html: string): string {
  const match = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  return match?.[1] ?? html;
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match || !match[1]) return "TechJournal";
  return match[1].replace(/\s+/g, " ").trim();
}

function resolveOrigin(request: Request): string {
  const url = new URL(request.url);
  return url.origin;
}

function isInternalPath(path: string): boolean {
  const pathname = path.split(/[?#]/, 1)[0].toLowerCase();
  return pathname === "/api" || pathname.startsWith("/api/") ||
    pathname === "/_next" || pathname.startsWith("/_next/") ||
    pathname === "/.well-known" || pathname.startsWith("/.well-known/");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const path = url.searchParams.get("path");

  if (!path || !path.startsWith("/") || path.startsWith("//") || isInternalPath(path)) {
    return NextResponse.json({ error: "Missing or invalid path parameter." }, { status: 400 });
  }

  const targetUrl = `${resolveOrigin(request)}${path}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  let upstream: Response;
  let html: string;
  try {
    upstream = await fetch(targetUrl, {
      headers: {
        Accept: "text/html",
        "x-skip-markdown-rewrite": "1",
      },
      next: { revalidate: 300 },
      signal: controller.signal,
    });

    if (!upstream.ok) {
      return new NextResponse("Not Found", {
        status: upstream.status === 404 ? 404 : 502,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }

    const declaredLength = Number(upstream.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > MAX_UPSTREAM_HTML_BYTES) {
      return NextResponse.json({ error: "Upstream page too large" }, { status: 502 });
    }

    html = await upstream.text();
    if (new TextEncoder().encode(html).byteLength > MAX_UPSTREAM_HTML_BYTES) {
      return NextResponse.json({ error: "Upstream page too large" }, { status: 502 });
    }
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return NextResponse.json(
      { error: timedOut ? "Upstream timeout" : "Upstream unavailable" },
      { status: timedOut ? 504 : 502 },
    );
  } finally {
    clearTimeout(timeoutId);
  }
  const title = extractTitle(html);
  const focusedHtml = extractMainHtml(html);
  const cleanedHtml = stripNonContentTags(focusedHtml);
  const markdownBody = htmlToMarkdown(cleanedHtml);
  const markdown = [`# ${title}`, "", `Source: ${path}`, "", markdownBody].join("\n").trim();

  const response = new NextResponse(markdown, {
    status: 200,
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": MARKDOWN_CACHE_CONTROL,
      "x-content-format": "markdown",
      "x-markdown-tokens": String(estimateMarkdownTokens(markdown)),
      Link: `</api>; rel="service-desc", </docs>; rel="service-doc", </.well-known/api-catalog>; rel="api-catalog"`,
    },
  });

  const lastModified = upstream.headers.get("last-modified");
  if (lastModified) {
    response.headers.set("last-modified", lastModified);
  }

  return response;
}
