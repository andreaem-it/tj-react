import { NextRequest, NextResponse } from "next/server";
import { getTjApiBaseUrl } from "@/lib/config/tjApi";

/**
 * Inoltra la richiesta a tj-api con stesso path e query string.
 * Per route admin basate su sessione cookie, inoltra l’header `Cookie` verso l’upstream.
 * Pass-through di status e body; errore di rete → 502.
 */
export async function proxyToTjApi(request: NextRequest): Promise<NextResponse> {
  const base = getTjApiBaseUrl();
  if (!base) {
    return NextResponse.json(
      { error: "TJ_API_BASE_URL non configurato" },
      { status: 503 },
    );
  }

  const path = request.nextUrl.pathname + request.nextUrl.search;
  const url = `${base}${path}`;

  const headers = new Headers();
  const cookie = request.headers.get("cookie");
  if (cookie) {
    headers.set("Cookie", cookie);
  }
  const accept = request.headers.get("accept");
  if (accept) {
    headers.set("Accept", accept);
  }

  let body: BodyInit | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    const buf = await request.arrayBuffer();
    if (buf.byteLength > 0) {
      body = buf;
    }
  }
  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers.set("Content-Type", contentType);
  }

  try {
    const res = await fetch(url, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
    });

    const text = await res.text();
    const outHeaders = new Headers();
    const upstreamCt = res.headers.get("content-type");
    if (upstreamCt) {
      outHeaders.set("Content-Type", upstreamCt);
    }

    return new NextResponse(text, {
      status: res.status,
      headers: outHeaders,
    });
  } catch {
    return NextResponse.json({ error: "Upstream error" }, { status: 502 });
  }
}
