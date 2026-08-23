import { NextRequest, NextResponse } from "next/server";
import { proxyToTjApi } from "@/lib/tjApiProxy";

export const dynamic = "force-dynamic";

/** GET ?refresh=1 → tj-api (Graph Meta). */
export async function GET(request: NextRequest) {
  const refreshParam = request.nextUrl.searchParams.get("refresh");
  if (refreshParam !== null && refreshParam !== "0" && refreshParam !== "1") {
    return NextResponse.json({ error: "Parametro refresh non valido" }, { status: 400 });
  }
  const refresh = refreshParam === "1";
  return proxyToTjApi(request, { timeoutMs: refresh ? 15_000 : 10_000 });
}
