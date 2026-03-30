import type { NextRequest } from "next/server";
import { proxyToTjApi } from "@/lib/tjApiProxy";

export async function GET(request: NextRequest) {
  return proxyToTjApi(request);
}
