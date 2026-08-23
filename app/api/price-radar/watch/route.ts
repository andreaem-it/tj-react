import { NextRequest, NextResponse } from "next/server";
import { proxyPriceRadarToTjApi } from "@/lib/priceRadar/proxyTjApi";

export const dynamic = "force-dynamic";

/**
 * Avviso di prezzo (§24): registra/rimuove `{ endpoint, asin, targetPrice }`
 * lato tj-api, legato a una sottoscrizione push già attiva. Nessun segreto
 * qui: chi chiama è il browser del lettore, come `/api/push/subscribe`.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.clone().json();
  } catch {
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
  if (endpoint.protocol !== "https:" || !/^[A-Z0-9]{10}$/.test(value.asin ?? "") || !targetValid) {
    return NextResponse.json({ error: "Invalid watch payload" }, { status: 400 });
  }
  return proxyPriceRadarToTjApi(request, { admin: false });
}

export async function DELETE(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.clone().json();
  } catch {
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
  if (endpoint.protocol !== "https:" || !/^[A-Z0-9]{10}$/.test(value.asin ?? "")) {
    return NextResponse.json({ error: "Invalid watch payload" }, { status: 400 });
  }
  return proxyPriceRadarToTjApi(request, { admin: false });
}
