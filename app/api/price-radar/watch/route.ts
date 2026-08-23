import { NextRequest, NextResponse } from "next/server";
import { proxyPriceRadarToTjApi } from "@/lib/priceRadar/proxyTjApi";

export const dynamic = "force-dynamic";
const MAX_WATCH_PAYLOAD_BYTES = 16 * 1024;

async function parseWatchPayload(request: NextRequest): Promise<unknown> {
  const raw = await request.clone().text();
  if (Buffer.byteLength(raw, "utf8") > MAX_WATCH_PAYLOAD_BYTES) {
    throw new RangeError("Payload too large");
  }
  return JSON.parse(raw);
}

function isValidPushEndpoint(endpoint: URL): boolean {
  return (
    endpoint.protocol === "https:" &&
    endpoint.href.length <= 4096 &&
    endpoint.username === "" &&
    endpoint.password === "" &&
    endpoint.hash === ""
  );
}

/**
 * Avviso di prezzo (§24): registra/rimuove `{ endpoint, asin, targetPrice }`
 * lato tj-api, legato a una sottoscrizione push già attiva. Nessun segreto
 * qui: chi chiama è il browser del lettore, come `/api/push/subscribe`.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await parseWatchPayload(request);
  } catch (error) {
    if (error instanceof RangeError) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid watch payload" }, { status: 400 });
  }
  const value = body as Partial<{ endpoint: string; asin: string; targetPrice: number | null }>;
  let endpoint: URL;
  try {
    endpoint = new URL(value.endpoint ?? "");
  } catch {
    return NextResponse.json({ error: "Invalid watch payload" }, { status: 400 });
  }
  const targetValid =
    value.targetPrice === null ||
    (typeof value.targetPrice === "number" &&
      Number.isFinite(value.targetPrice) &&
      value.targetPrice > 0 &&
      value.targetPrice <= 1_000_000);
  if (!isValidPushEndpoint(endpoint) || !/^[A-Z0-9]{10}$/.test(value.asin ?? "") || !targetValid) {
    return NextResponse.json({ error: "Invalid watch payload" }, { status: 400 });
  }
  return proxyPriceRadarToTjApi(request, { admin: false });
}

export async function DELETE(request: NextRequest) {
  let body: unknown;
  try {
    body = await parseWatchPayload(request);
  } catch (error) {
    if (error instanceof RangeError) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid watch payload" }, { status: 400 });
  }
  const value = body as Partial<{ endpoint: string; asin: string }>;
  let endpoint: URL;
  try {
    endpoint = new URL(value.endpoint ?? "");
  } catch {
    return NextResponse.json({ error: "Invalid watch payload" }, { status: 400 });
  }
  if (!isValidPushEndpoint(endpoint) || !/^[A-Z0-9]{10}$/.test(value.asin ?? "")) {
    return NextResponse.json({ error: "Invalid watch payload" }, { status: 400 });
  }
  return proxyPriceRadarToTjApi(request, { admin: false });
}
