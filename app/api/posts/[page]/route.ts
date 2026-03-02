import { fetchPostsPageFromWordPress } from "@/lib/api";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/posts/3 → richiede la pagina 3 a WordPress (solo Node https, nessuna cache). */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ page: string }> }
) {
  try {
    const { page: pageParam } = await params;
    const page = Math.max(1, Number(pageParam) || 1);
    const perPage = 10;
    const { posts, totalPages } = await fetchPostsPageFromWordPress(page, perPage);
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
