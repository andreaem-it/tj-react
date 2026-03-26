import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { proxyToTjApi } from "@/lib/tjApiProxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await params;
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  return proxyToTjApi(request);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await params;
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  return proxyToTjApi(request);
}

/** Compatibilità client che usano PATCH: stesso contratto di PUT verso tj-api. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await params;
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  return proxyToTjApi(request, { methodOverride: "PUT" });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await params;
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  return proxyToTjApi(request);
}
