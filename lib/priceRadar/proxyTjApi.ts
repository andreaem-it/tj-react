import { NextRequest, NextResponse } from "next/server";
import { getTjApiBaseUrl } from "@/lib/config/tjApi";

export type ProxyTjApiOptions = {
  /** Se true, usa `Authorization: Bearer <PRICE_RADAR_ADMIN_SECRET>` lato server verso tj-api. */
  admin: boolean;
  /** Timeout fetch verso tj-api (ms). */
  timeoutMs?: number;
};

const DEFAULT_UPSTREAM_TIMEOUT_MS = 10_000;
const MAX_REQUEST_BODY_BYTES = 10 * 1024 * 1024;
const MAX_RESPONSE_BODY_BYTES = 10 * 1024 * 1024;

/**
 * Inoltra la richiesta a tj-api mantenendo lo stesso path e query string.
 * Risposte upstream: status e body pass-through; in caso di errore di rete: 502.
 */
export async function proxyPriceRadarToTjApi(
  request: NextRequest,
  options: ProxyTjApiOptions,
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

  const headers = new Headers();
  if (options.admin) {
    const secret = process.env.PRICE_RADAR_ADMIN_SECRET?.trim();
    if (!secret) {
      return NextResponse.json(
        { error: "PRICE_RADAR_ADMIN_SECRET non configurato" },
        { status: 503 },
      );
    }
    headers.set("Authorization", `Bearer ${secret}`);
  }

  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers.set("Content-Type", contentType);
  }
  const accept = request.headers.get("accept");
  if (accept) {
    headers.set("Accept", accept);
  }

  let body: BodyInit | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    const reqLenHeader = request.headers.get("content-length");
    const reqLen =
      typeof reqLenHeader === "string" && reqLenHeader.trim() !== ""
        ? Number(reqLenHeader)
        : Number.NaN;
    if (Number.isFinite(reqLen) && reqLen > MAX_REQUEST_BODY_BYTES) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }
    const buf = await request.arrayBuffer();
    if (buf.byteLength > MAX_REQUEST_BODY_BYTES) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }
    if (buf.byteLength > 0) {
      body = buf;
    }
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_UPSTREAM_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const upstreamLenHeader = res.headers.get("content-length");
    const upstreamLen =
      typeof upstreamLenHeader === "string" && upstreamLenHeader.trim() !== ""
        ? Number(upstreamLenHeader)
        : Number.NaN;
    if (Number.isFinite(upstreamLen) && upstreamLen > MAX_RESPONSE_BODY_BYTES) {
      return NextResponse.json({ error: "Upstream payload too large" }, { status: 502 });
    }

    const text = await res.text();
    if (Buffer.byteLength(text, "utf8") > MAX_RESPONSE_BODY_BYTES) {
      return NextResponse.json({ error: "Upstream payload too large" }, { status: 502 });
    }
    const outHeaders = new Headers();
    const upstreamCt = res.headers.get("content-type");
    if (upstreamCt) {
      outHeaders.set("Content-Type", upstreamCt);
    }

    return new NextResponse(text, {
      status: res.status,
      headers: outHeaders,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    const isAbort =
      err instanceof Error &&
      (err.name === "AbortError" || err.message === "This operation was aborted");
    return NextResponse.json(
      { error: isAbort ? "Upstream timeout" : "Upstream error" },
      { status: isAbort ? 504 : 502 },
    );
  }
}
