import { NextRequest, NextResponse } from "next/server";
import { fetchPostViewsCount, incrementPostViewsCount } from "@/lib/postViewsApi";

export const dynamic = "force-dynamic";

function parsePostId(pathname: string): number | null {
  const m = pathname.match(/\/api\/views\/(\d+)$/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isInteger(n) && n > 0 ? n : null;
}

const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate" };

export async function GET(request: NextRequest) {
  const postId = parsePostId(request.nextUrl.pathname);
  if (!postId) {
    return NextResponse.json({ error: "postId non valido" }, { status: 400 });
  }

  const views = await fetchPostViewsCount(postId);
  if (views == null) {
    return NextResponse.json(
      { error: "Conteggio visualizzazioni non disponibile" },
      { status: 503, headers: NO_STORE },
    );
  }

  return NextResponse.json({ postId, views }, { status: 200, headers: NO_STORE });
}

export async function POST(request: NextRequest) {
  const postId = parsePostId(request.nextUrl.pathname);
  if (!postId) {
    return NextResponse.json({ error: "postId non valido" }, { status: 400 });
  }

  const views = await incrementPostViewsCount(postId);
  if (views == null) {
    return NextResponse.json(
      { error: "Incremento visualizzazioni non disponibile" },
      { status: 503, headers: NO_STORE },
    );
  }

  return NextResponse.json({ ok: true, postId, views }, { status: 200, headers: NO_STORE });
}
