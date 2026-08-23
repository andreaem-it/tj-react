import { NextRequest, NextResponse } from "next/server";
import { proxyPriceRadarToTjApi } from "@/lib/priceRadar/proxyTjApi";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const search = params.get("search");
  if (search && search.trim().length > 100) {
    return NextResponse.json({ error: "Search query too long" }, { status: 400 });
  }
  const status = params.get("status");
  if (status && !["active", "paused", "all"].includes(status)) {
    return NextResponse.json({ error: "Invalid product status" }, { status: 400 });
  }
  const sort = params.get("sort");
  if (sort && !["discount", "newest", "price"].includes(sort)) {
    return NextResponse.json({ error: "Invalid product sort" }, { status: 400 });
  }
  return proxyPriceRadarToTjApi(request, { admin: false });
}
