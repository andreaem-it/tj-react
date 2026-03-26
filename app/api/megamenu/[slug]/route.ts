import { NextRequest, NextResponse } from "next/server";
import { proxyToTjApi } from "@/lib/tjApiProxy";

export const dynamic = "force-dynamic";

const MEGAMENU_TTL_MS = 60_000;

const megamenuCache = new Map<
  string,
  {
    data: unknown;
    ts: number;
  }
>();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (!slug || typeof slug !== "string") {
    return NextResponse.json({ error: "Slug mancante" }, { status: 400 });
  }

  const pathname = request.nextUrl.pathname;
  const now = Date.now();
  const cached = megamenuCache.get(slug);

  if (cached && now - cached.ts < MEGAMENU_TTL_MS) {
    console.log("[WP Proxy]", "GET", pathname, 200);
    return NextResponse.json(cached.data, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60",
      },
    });
  }

  const res = await proxyToTjApi(request);
  const text = await res.text();

  if (res.ok) {
    try {
      const data = JSON.parse(text) as unknown;
      megamenuCache.set(slug, { data, ts: Date.now() });
    } catch {
      /* non JSON: non cache, pass-through sotto */
    }
    return new NextResponse(text, {
      status: res.status,
      headers: new Headers(res.headers),
    });
  }

  if (cached) {
    console.log("[WP Proxy]", "GET", pathname, 200);
    return NextResponse.json(cached.data, { status: 200 });
  }

  return NextResponse.json([], { status: 200 });
}
