import { NextRequest } from "next/server";
import { proxyPriceRadarToTjApi } from "@/lib/priceRadar/proxyTjApi";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return proxyPriceRadarToTjApi(request, { admin: false });
}
