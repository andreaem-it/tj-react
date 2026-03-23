import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import * as articlesDb from "@/lib/db/articles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as articlesDb.ArticleStatus | null;
  const page = Number(searchParams.get("page")) || 1;
  const perPage = Math.min(50, Math.max(1, Number(searchParams.get("perPage")) || 10));
  const { items, total } = articlesDb.listArticles(
    status ? { status, page, perPage } : { page, perPage }
  );
  return NextResponse.json({
    articles: items,
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
  });
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON non valido" }, { status: 400 });
  }
  const o = body as Record<string, unknown>;
  const title = typeof o.title === "string" ? o.title.trim() : "";
  const slug =
    typeof o.slug === "string"
      ? o.slug.trim().toLowerCase().replace(/\s+/g, "-")
      : title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  if (!title) {
    return NextResponse.json({ error: "Titolo obbligatorio" }, { status: 400 });
  }
  const existing = articlesDb.getArticleBySlug(slug);
  if (existing) {
    return NextResponse.json(
      { error: "Esiste già un articolo con questo slug" },
      { status: 409 }
    );
  }
  const status = (o.status as articlesDb.ArticleStatus) ?? "draft";
  const publishedAt =
    typeof o.published_at === "string" && o.published_at
      ? o.published_at
      : status === "published"
        ? new Date().toISOString()
        : null;
  const article = articlesDb.createArticle({
    title,
    slug,
    excerpt: typeof o.excerpt === "string" ? o.excerpt : "",
    content: typeof o.content === "string" ? o.content : "",
    category_id: typeof o.category_id === "number" ? o.category_id : null,
    category_name: typeof o.category_name === "string" ? o.category_name : "",
    category_slug: typeof o.category_slug === "string" ? o.category_slug : "",
    author_name: typeof o.author_name === "string" ? o.author_name : session.user,
    status,
    source: "native",
    published_at: publishedAt,
    meta_title: typeof o.meta_title === "string" ? o.meta_title : null,
    meta_description: typeof o.meta_description === "string" ? o.meta_description : null,
    image_url: typeof o.image_url === "string" ? o.image_url : null,
    image_alt: typeof o.image_alt === "string" ? o.image_alt : "",
  });
  return NextResponse.json(article, { status: 201 });
}
