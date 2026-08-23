import { NextRequest, NextResponse } from "next/server";
import { proxyPriceRadarToTjApi } from "@/lib/priceRadar/proxyTjApi";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get("search");
  if (search && search.trim().length > 100) {
    return NextResponse.json({ error: "Search query too long" }, { status: 400 });
  }
  return proxyPriceRadarToTjApi(request, { admin: false });
}
