import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { proxyToTjApi } from "@/lib/tjApiProxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      { error: "Non autenticato" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }
  return proxyToTjApi(request);
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      { error: "Non autenticato" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return NextResponse.json(
      { error: "Content-Type non supportato" },
      { status: 415, headers: { "Cache-Control": "no-store" } },
    );
  }
  return proxyToTjApi(request);
}
