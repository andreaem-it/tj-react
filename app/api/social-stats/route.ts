import { NextRequest } from "next/server";
import { proxyToTjApi } from "@/lib/tjApiProxy";

export const dynamic = "force-dynamic";

/** GET ?refresh=1 → tj-api (Graph Meta). */
export async function GET(request: NextRequest) {
  return proxyToTjApi(request, { timeoutMs: 60_000 });
}
