import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import * as articlesDb from "@/lib/db/articles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId < 1) {
    return NextResponse.json({ error: "ID non valido" }, { status: 400 });
  }
  const article = articlesDb.getArticleById(numId);
  if (!article) {
    return NextResponse.json({ error: "Articolo non trovato" }, { status: 404 });
  }
  return NextResponse.json(article);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId < 1) {
    return NextResponse.json({ error: "ID non valido" }, { status: 400 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON non valido" }, { status: 400 });
  }
  const o = body as Record<string, unknown>;
  const update: Partial<articlesDb.ArticleInsert> & { modified_at?: string } = {};
  if (typeof o.title === "string") update.title = o.title.trim();
  if (typeof o.slug === "string")
    update.slug = o.slug.trim().toLowerCase().replace(/\s+/g, "-");
  if (typeof o.excerpt === "string") update.excerpt = o.excerpt;
  if (typeof o.content === "string") update.content = o.content;
  if (typeof o.category_id === "number") update.category_id = o.category_id;
  if (typeof o.category_name === "string") update.category_name = o.category_name;
  if (typeof o.category_slug === "string") update.category_slug = o.category_slug;
  if (typeof o.author_name === "string") update.author_name = o.author_name;
  if (typeof o.status === "string" && ["draft", "published", "private", "archived"].includes(o.status))
    update.status = o.status as articlesDb.ArticleStatus;
  if (typeof o.published_at === "string") update.published_at = o.published_at || null;
  if (o.meta_title !== undefined) update.meta_title = typeof o.meta_title === "string" ? o.meta_title : null;
  if (o.meta_description !== undefined) update.meta_description = typeof o.meta_description === "string" ? o.meta_description : null;
  if (typeof o.image_url === "string") update.image_url = o.image_url || null;
  if (typeof o.image_alt === "string") update.image_alt = o.image_alt;
  update.modified_at = new Date().toISOString();
  if (o.status === "published" && update.status === "published") {
    const existing = articlesDb.getArticleById(numId);
    if (existing && !existing.published_at) {
      (update as Record<string, unknown>).published_at = new Date().toISOString();
    }
  }
  const article = articlesDb.updateArticle(numId, update);
  if (!article) {
    return NextResponse.json({ error: "Articolo non trovato" }, { status: 404 });
  }
  return NextResponse.json(article);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId < 1) {
    return NextResponse.json({ error: "ID non valido" }, { status: 400 });
  }
  const ok = articlesDb.deleteArticle(numId);
  if (!ok) {
    return NextResponse.json({ error: "Articolo non trovato" }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
