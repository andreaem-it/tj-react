import { NextRequest, NextResponse } from "next/server";
import { proxyPriceRadarToTjApi } from "@/lib/priceRadar/proxyTjApi";

export const dynamic = "force-dynamic";
const MAX_PAYLOAD_BYTES = 4 * 1024;

export async function POST(request: NextRequest) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ error: "Unsupported Content-Type" }, { status: 415 });
  }
  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > MAX_PAYLOAD_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }
  const value = body as { url?: unknown; title?: unknown; website?: unknown };
  if (
    typeof value.url !== "string" || value.url.length > 2048 ||
    (value.title != null && (typeof value.title !== "string" || value.title.length > 180)) ||
    (value.website != null && (typeof value.website !== "string" || value.website.length > 200))
  ) {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }
  return proxyPriceRadarToTjApi(
    new NextRequest(request.url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(value),
    }),
    { admin: false },
  );
}
