import { NextRequest, NextResponse } from "next/server";
import { proxyToTjApi } from "@/lib/tjApiProxy";

export const dynamic = "force-dynamic";

function parsePostId(pathname: string): number | null {
  const m = pathname.match(/\/api\/views\/(\d+)$/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function GET(request: NextRequest) {
  const postId = parsePostId(request.nextUrl.pathname);
  if (!postId) {
    return NextResponse.json({ error: "postId non valido" }, { status: 400 });
  }
  return proxyToTjApi(request);
}

export async function POST(request: NextRequest) {
  const postId = parsePostId(request.nextUrl.pathname);
  if (!postId) {
    return NextResponse.json({ error: "postId non valido" }, { status: 400 });
  }
  return proxyToTjApi(request);
}
