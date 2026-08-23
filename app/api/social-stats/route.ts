import { NextRequest } from "next/server";
import { proxyToTjApi } from "@/lib/tjApiProxy";

export const dynamic = "force-dynamic";

/** GET ?refresh=1 → tj-api (Graph Meta). */
export async function GET(request: NextRequest) {
  const refresh = request.nextUrl.searchParams.get("refresh") === "1";
  return proxyToTjApi(request, { timeoutMs: refresh ? 15_000 : 10_000 });
}
