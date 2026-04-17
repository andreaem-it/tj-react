import { NextResponse } from "next/server";
import { fetchPostBySlug, getCategoryUrlSlugFromWpSlug } from "@/lib/api";
import { SITE_URL } from "@/lib/constants";
import { htmlToMarkdown } from "@/lib/markdown";

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

  const post = await fetchPostBySlug(slug);
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
  const markdownParts = [
    `# ${post.title}`,
    "",
    `- URL: ${canonicalUrl}`,
    `- Categoria: ${post.categoryName}`,
    `- Pubblicato: ${new Date(post.date).toISOString()}`,
    `- Autore: ${post.authorName}`,
    "",
    post.excerpt?.trim() ? post.excerpt.trim() : "",
    "",
    htmlToMarkdown(post.content),
  ].filter((part) => part.length > 0);

  return new NextResponse(markdownParts.join("\n"), {
    status: 200,
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "x-content-format": "markdown",
    },
  });
}
