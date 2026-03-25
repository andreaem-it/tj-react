import { NextRequest, NextResponse } from "next/server";
import { getTjApiBaseUrl } from "@/lib/config/tjApi";

export type ProxyTjApiOptions = {
  /** Se true, usa `Authorization: Bearer <PRICE_RADAR_ADMIN_SECRET>` lato server verso tj-api. */
  admin: boolean;
};

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
    const buf = await request.arrayBuffer();
    if (buf.byteLength > 0) {
      body = buf;
    }
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
