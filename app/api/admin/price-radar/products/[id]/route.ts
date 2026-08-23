import { NextRequest, NextResponse } from "next/server";
import { isPriceRadarAdminConfigured, isPriceRadarAdminRequest } from "@/lib/priceRadar/adminAuth";
import { proxyPriceRadarToTjApi } from "@/lib/priceRadar/proxyTjApi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function unauthorized(): NextResponse {
  return NextResponse.json(
    { error: "Non autorizzato" },
    { status: 401, headers: { "Cache-Control": "no-store" } },
  );
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id)) {
    return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
  }
  if (!isPriceRadarAdminConfigured()) {
    return NextResponse.json(
      { error: "PRICE_RADAR_ADMIN_SECRET non configurato" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (!isPriceRadarAdminRequest(request)) {
    return unauthorized();
  }
  return proxyPriceRadarToTjApi(request, { admin: true });
}
