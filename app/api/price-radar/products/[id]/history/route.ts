import { NextRequest, NextResponse } from "next/server";
import { proxyPriceRadarToTjApi } from "@/lib/priceRadar/proxyTjApi";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id)) {
    return NextResponse.json(
      { error: "Invalid product id" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  const range = request.nextUrl.searchParams.get("range");
  if (range && !["7d", "30d", "90d", "1y", "max"].includes(range)) {
    return NextResponse.json(
      { error: "Invalid history range" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  return proxyPriceRadarToTjApi(request, { admin: false });
}
