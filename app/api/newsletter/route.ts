import { NextRequest } from "next/server";
import { proxyToTjApi } from "@/lib/tjApiProxy";

export const dynamic = "force-dynamic";

/** POST body JSON → tj-api (Brevo). */
export async function POST(request: NextRequest) {
  return proxyToTjApi(request, { timeoutMs: 30_000 });
}
