import type { NextRequest } from "next/server";
import { proxyToTjApi } from "@/lib/tjApiProxy";

export async function POST(request: NextRequest) {
  return proxyToTjApi(request);
}
