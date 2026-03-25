import { NextRequest, NextResponse } from "next/server";
import { isPriceRadarAdminConfigured, isPriceRadarAdminRequest } from "@/lib/priceRadar/adminAuth";
import { proxyPriceRadarToTjApi } from "@/lib/priceRadar/proxyTjApi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
}

export async function GET(request: NextRequest) {
  if (!isPriceRadarAdminConfigured()) {
    return NextResponse.json(
      { error: "PRICE_RADAR_ADMIN_SECRET non configurato" },
      { status: 503 },
    );
  }
  if (!isPriceRadarAdminRequest(request)) {
    return unauthorized();
  }
  return proxyPriceRadarToTjApi(request, { admin: true });
}

export async function POST(request: NextRequest) {
  if (!isPriceRadarAdminConfigured()) {
    return NextResponse.json(
      { error: "PRICE_RADAR_ADMIN_SECRET non configurato" },
      { status: 503 },
    );
  }
  if (!isPriceRadarAdminRequest(request)) {
    return unauthorized();
  }
  return proxyPriceRadarToTjApi(request, { admin: true });
}
