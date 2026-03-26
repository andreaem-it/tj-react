import { NextRequest, NextResponse } from "next/server";
import { getTjApiBaseUrl } from "@/lib/config/tjApi";

export type ProxyToTjApiOptions = {
  /** Es. PATCH in ingresso → PUT verso tj-api (articoli). */
  methodOverride?: string;
};

/**
 * Header di risposta upstream da ripassare al client (stesso nome, case-insensitive in fetch).
 * Include wordpress-content: X-Next-Page, X-Next-Already, Cache-Control, Pragma.
 */
const UPSTREAM_RESPONSE_HEADERS_TO_FORWARD = [
  "content-type",
  "cache-control",
  "pragma",
  "x-next-page",
  "x-next-already",
] as const;

/**
 * Inoltra la richiesta a tj-api con stesso path e query string.
 * Per route admin basate su sessione cookie, inoltra l’header `Cookie` verso l’upstream.
 * Pass-through di status e body; errore di rete → 502.
 *
 * Body (JSON o multipart): lettura come `ArrayBuffer` e reinvio con gli stessi header
 * `Content-Type` (boundary incluso per form-data), senza riparsing del multipart.
 */
export async function proxyToTjApi(
  request: NextRequest,
  options?: ProxyToTjApiOptions,
): Promise<NextResponse> {
  const base = getTjApiBaseUrl();
  if (!base) {
    return NextResponse.json(
      { error: "TJ_API_BASE_URL non configurato" },
      { status: 503 },
    );
  }

  const path = request.nextUrl.pathname + request.nextUrl.search;
  const url = `${base}${path}`;

  const method = options?.methodOverride ?? request.method;

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
  if (method !== "GET" && method !== "HEAD") {
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
      method,
      headers,
      body,
      cache: "no-store",
    });

    const text = await res.text();
    const outHeaders = new Headers();

    for (const name of UPSTREAM_RESPONSE_HEADERS_TO_FORWARD) {
      const v = res.headers.get(name);
      if (v) {
        outHeaders.set(name, v);
      }
    }

    const setCookies =
      typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : null;
    if (setCookies?.length) {
      for (const c of setCookies) {
        outHeaders.append("Set-Cookie", c);
      }
    } else {
      const single = res.headers.get("set-cookie");
      if (single) {
        outHeaders.append("Set-Cookie", single);
      }
    }

    return new NextResponse(text, {
      status: res.status,
      headers: outHeaders,
    });
  } catch {
    return NextResponse.json({ error: "Upstream error" }, { status: 502 });
  }
}
