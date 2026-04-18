import { NextResponse } from "next/server";
import { estimateMarkdownTokens, htmlToMarkdown } from "@/lib/markdown";

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
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost) {
    const proto = forwardedProto || "https";
    return `${proto}://${forwardedHost}`;
  }
  return `${url.protocol}//${url.host}`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const path = url.searchParams.get("path");

  if (!path || !path.startsWith("/")) {
    return NextResponse.json({ error: "Missing or invalid path parameter." }, { status: 400 });
  }

  const targetUrl = `${resolveOrigin(request)}${path}`;
  const upstream = await fetch(targetUrl, {
    headers: {
      Accept: "text/html",
      "x-skip-markdown-rewrite": "1",
    },
    cache: "no-store",
  });

  if (!upstream.ok) {
    return new NextResponse("Not Found", {
      status: upstream.status === 404 ? 404 : 502,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const html = await upstream.text();
  const focusedHtml = extractMainHtml(html);
  const cleanedHtml = stripNonContentTags(focusedHtml);
  const title = extractTitle(cleanedHtml);
  const markdownBody = htmlToMarkdown(cleanedHtml);
  const markdown = [`# ${title}`, "", `Source: ${path}`, "", markdownBody].join("\n").trim();

  const response = new NextResponse(markdown, {
    status: 200,
    headers: {
      "content-type": "text/markdown; charset=utf-8",
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
