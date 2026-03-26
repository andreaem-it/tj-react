import { NextRequest, NextResponse } from "next/server";
import { getTjApiBaseUrl } from "@/lib/config/tjApi";

export type ProxyToTjApiOptions = {
  /** Es. PATCH in ingresso → PUT verso tj-api (articoli). */
  methodOverride?: string;
};

const UPSTREAM_TIMEOUT_MS = 10_000;

/**
 * Header di risposta upstream da ripassare al client (case-insensitive in fetch).
 */
const UPSTREAM_RESPONSE_HEADERS_TO_FORWARD = [
  "content-type",
  "cache-control",
  "pragma",
  "x-next-page",
  "x-next-already",
] as const;

function buildUpstreamResponseHeaders(res: Response): Headers {
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
  return outHeaders;
}

/**
 * Inoltra la richiesta a tj-api con stesso path e query string.
 * Cookie solo verso upstream (non loggati). Timeout 10s. Loop se stesso origin del request.
 */
export async function proxyToTjApi(
  request: NextRequest,
  options?: ProxyToTjApiOptions,
): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;
  const base = getTjApiBaseUrl();
  if (!base) {
    console.log("[WP Proxy]", request.method, pathname, 503);
    return NextResponse.json(
      { error: "TJ_API_BASE_URL non configurato" },
      { status: 503 },
    );
  }

  let upstreamOrigin: string;
  try {
    upstreamOrigin = new URL(base).origin;
  } catch {
    console.log("[WP Proxy]", request.method, pathname, 500);
    return NextResponse.json({ error: "TJ_API_BASE_URL non valido" }, { status: 500 });
  }

  if (upstreamOrigin === request.nextUrl.origin) {
    console.log("[WP Proxy]", request.method, pathname, 500);
    return NextResponse.json({ error: "Proxy loop detected" }, { status: 500 });
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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method,
      headers,
      body,
      cache: "no-store",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log("[WP Proxy]", method, pathname, res.status);

    const text = await res.text();
    const outHeaders = buildUpstreamResponseHeaders(res);

    return new NextResponse(text, {
      status: res.status,
      headers: outHeaders,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    const isAbort =
      err instanceof Error &&
      (err.name === "AbortError" || err.message === "This operation was aborted");
    const status = isAbort ? 504 : 502;
    console.log("[WP Proxy]", method, pathname, status);
    return NextResponse.json(
      { error: isAbort ? "Upstream timeout" : "Upstream error" },
      { status },
    );
  }
}
