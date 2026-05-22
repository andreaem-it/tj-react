import { NextResponse } from "next/server";
import { fetchPostBySlug } from "@/lib/api";
import { WP_BASE } from "@/lib/constants";

export const dynamic = "force-dynamic";

/** Diagnostica: verifica che Vercel raggiunga l'API WP. GET /api/health/post?slug=... */
export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug")?.trim() ?? "";
  if (!slug) {
    return NextResponse.json({ ok: false, error: "missing slug" }, { status: 400 });
  }

  try {
    const post = await fetchPostBySlug(slug);
    return NextResponse.json({
      ok: Boolean(post),
      wpBase: WP_BASE,
      slug,
      title: post?.title ?? null,
      categorySlug: post?.categorySlug ?? null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, wpBase: WP_BASE, slug, error: message }, { status: 500 });
  }
}
