import { NextRequest } from "next/server";
import { proxyToTjApi } from "@/lib/tjApiProxy";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return proxyToTjApi(request);
}
