import { NextResponse } from "next/server";
import { fetchPostBySlug, getCategoryUrlSlugFromWpSlug } from "@/lib/api";
import { SITE_URL } from "@/lib/constants";
import { estimateMarkdownTokens, htmlToMarkdown } from "@/lib/markdown";

export const revalidate = 300;

const MARKDOWN_CACHE_CONTROL =
  "public, s-maxage=300, stale-while-revalidate=86400";

function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category")?.trim().toLowerCase();
  const slug = searchParams.get("slug")?.trim();

  if (!category || !slug) {
    return badRequest("Missing required query parameters.");
  }

  let post: Awaited<ReturnType<typeof fetchPostBySlug>>;
  try {
    post = await fetchPostBySlug(slug);
  } catch {
    return NextResponse.json({ error: "Article source unavailable." }, { status: 502 });
  }
  if (!post) {
    return new NextResponse("Not Found", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const postCategory = getCategoryUrlSlugFromWpSlug(post.categorySlug).toLowerCase();
  if (postCategory !== category) {
    return new NextResponse("Not Found", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const canonicalUrl = `${SITE_URL.replace(/\/$/, "")}/${postCategory}/${post.slug}`;
  const published = new Date(post.date);
  const hasValidPublishedDate = !Number.isNaN(published.getTime());
  const markdownParts = [
    `# ${post.title}`,
    "",
    `- URL: ${canonicalUrl}`,
    `- Categoria: ${post.categoryName}`,
    hasValidPublishedDate ? `- Pubblicato: ${published.toISOString()}` : "",
    `- Autore: ${post.authorName}`,
    "",
    post.excerpt?.trim() ? post.excerpt.trim() : "",
    "",
    htmlToMarkdown(post.content),
  ].filter((part) => part.length > 0);
  const markdown = markdownParts.join("\n");

  const headers = new Headers({
    "content-type": "text/markdown; charset=utf-8",
    "cache-control": MARKDOWN_CACHE_CONTROL,
    "x-content-format": "markdown",
    "x-markdown-tokens": String(estimateMarkdownTokens(markdown)),
    Link: `</api>; rel="service-desc", </docs>; rel="service-doc", </.well-known/api-catalog>; rel="api-catalog"`,
  });
  if (hasValidPublishedDate) headers.set("last-modified", published.toUTCString());

  return new NextResponse(markdown, {
    status: 200,
    headers,
  });
}
