import { NextResponse } from "next/server";
import { fetchPostBySlug } from "@/lib/api";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

/** Diagnostica: verifica che Vercel raggiunga l'API WP. GET /api/health/post?slug=... */
export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug")?.trim() ?? "";
  if (!slug || slug.length > 200 || !/^[a-z0-9-]+$/i.test(slug)) {
    return NextResponse.json(
      { ok: false, error: "invalid slug" },
      { status: 400, headers: NO_STORE },
    );
  }

  try {
    const post = await fetchPostBySlug(slug);
    return NextResponse.json(
      {
        ok: Boolean(post),
        slug,
        title: post?.title ?? null,
        categorySlug: post?.categorySlug ?? null,
      },
      { headers: NO_STORE },
    );
  } catch {
    return NextResponse.json(
      { ok: false, slug, error: "article source unavailable" },
      { status: 502, headers: NO_STORE },
    );
  }
}
