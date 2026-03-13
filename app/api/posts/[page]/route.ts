import { fetchPostsPageFromWordPress } from "@/lib/api";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/posts/3?category=123 → richiede la pagina 3 a tj/v1. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ page: string }> }
) {
  try {
    const { page: pageParam } = await params;
    const page = Math.max(1, Number(pageParam) || 1);
    const perPage = 10;
    const categoryId = request.nextUrl.searchParams.get("category");
    const catId = categoryId ? Math.max(0, parseInt(categoryId, 10)) : undefined;
    const { posts, totalPages } = await fetchPostsPageFromWordPress(
      page,
      perPage,
      catId && catId > 0 ? catId : undefined
    );
    const res = NextResponse.json({ posts, totalPages });
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    return res;
  } catch (err) {
    console.error("[api/posts/[page]]", err);
    return NextResponse.json(
      { error: "Errore caricamento post", posts: [], totalPages: 0 },
      { status: 500 }
    );
  }
}
