import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function parsePostId(pathname: string): number | null {
  const m = pathname.match(/\/api\/views\/(\d+)$/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function normalizeBase(url: string): string {
  return url.replace(/\/$/, "");
}

function getWpEndpoints(postId: number): string[] {
  const apiBase = normalizeBase(
    (process.env.NEXT_PUBLIC_API_BASE ?? "https://api.techjournal.it").trim(),
  );
  const wpBase = normalizeBase(
    (process.env.NEXT_PUBLIC_WP_BASE ?? `${apiBase}/wp-json/tj/v1`).trim(),
  );
  let wpOrigin = apiBase;
  try {
    wpOrigin = new URL(wpBase).origin;
  } catch {
    // keep apiBase fallback
  }

  return [
    `${wpBase}/views/${postId}`,
    `${wpOrigin}/wp-json/pvc/v1/posts/${postId}`,
    `${wpOrigin}/wp-json/post-views-counter/v1/views/${postId}`,
  ];
}

function parseViewsPayload(data: unknown): number | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  const candidates = [o.views, o.count, o.post_views, o.viewCount, o.total];
  for (const c of candidates) {
    const n = typeof c === "number" ? c : Number(c);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return null;
}

async function fetchJsonSafe(url: string, init?: RequestInit): Promise<{
  ok: boolean;
  status: number;
  data: unknown | null;
}> {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      ...init,
    });
    const text = await res.text();
    let data: unknown | null = null;
    if (text.trim()) {
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }
    }
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

export async function GET(request: NextRequest) {
  const postId = parsePostId(request.nextUrl.pathname);
  if (!postId) {
    return NextResponse.json({ error: "postId non valido" }, { status: 400 });
  }

  const endpoints = getWpEndpoints(postId);
  for (const endpoint of endpoints) {
    const out = await fetchJsonSafe(endpoint);
    if (!out.ok) continue;
    const views = parseViewsPayload(out.data);
    if (views != null) {
      return NextResponse.json({ postId, views }, { status: 200 });
    }
  }

  return NextResponse.json({ postId, views: 0 }, { status: 200 });
}

export async function POST(request: NextRequest) {
  const postId = parsePostId(request.nextUrl.pathname);
  if (!postId) {
    return NextResponse.json({ error: "postId non valido" }, { status: 400 });
  }

  const endpoints = getWpEndpoints(postId);
  const attempts: Array<{ url: string; init: RequestInit }> = [
    ...endpoints.map((url) => ({
      url,
      init: {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ increment: true }),
      },
    })),
    {
      url: `${endpoints[2]}?increment=1`,
      init: { method: "GET" },
    },
    {
      url: `${endpoints[1]}?increment=1`,
      init: { method: "GET" },
    },
  ];

  for (const attempt of attempts) {
    const out = await fetchJsonSafe(attempt.url, attempt.init);
    if (!out.ok) continue;
    const payloadViews = parseViewsPayload(out.data);
    if (payloadViews != null) {
      return NextResponse.json({ ok: true, postId, views: payloadViews }, { status: 200 });
    }
    // Se non arriva il conteggio nel payload, rileggiamo.
    for (const endpoint of endpoints) {
      const fresh = await fetchJsonSafe(endpoint);
      if (!fresh.ok) continue;
      const views = parseViewsPayload(fresh.data);
      if (views != null) {
        return NextResponse.json({ ok: true, postId, views }, { status: 200 });
      }
    }
    return NextResponse.json({ ok: true, postId, views: 0 }, { status: 200 });
  }

  return NextResponse.json({ error: "Incremento views non riuscito" }, { status: 502 });
}
