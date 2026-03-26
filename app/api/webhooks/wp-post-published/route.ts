import { NextRequest } from "next/server";
import { proxyToTjApi } from "@/lib/tjApiProxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** POST → tj-api (verifica secret lato upstream). */
export async function POST(request: NextRequest) {
  return proxyToTjApi(request, { timeoutMs: 120_000 });
}
