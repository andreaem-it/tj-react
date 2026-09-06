import { NextRequest, NextResponse } from "next/server";
import { isFeatureEnabled } from "@/lib/featureFlags";
import { proxyToTjApi } from "@/lib/tjApiProxy";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isFeatureEnabled("articleAudio")) {
    return NextResponse.json({ error: "Audio articolo non disponibile" }, { status: 404 });
  }
  return proxyToTjApi(request, { timeoutMs: 15_000 });
}
