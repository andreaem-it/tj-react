import { proxyToTjApi } from "@/lib/tjApiProxy";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export function POST(request: NextRequest) {
  return proxyToTjApi(request);
}
