import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { proxyToTjApi } from "@/lib/tjApiProxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function hasValidId(params: Promise<{ id: string }>): Promise<boolean> {
  const { id } = await params;
  return /^[1-9]\d*$/.test(id);
}

function invalidId(): NextResponse {
  return NextResponse.json(
    { error: "ID articolo non valido" },
    { status: 400, headers: { "Cache-Control": "no-store" } },
  );
}

function unauthenticated(): NextResponse {
  return NextResponse.json(
    { error: "Non autenticato" },
    { status: 401, headers: { "Cache-Control": "no-store" } },
  );
}

function unsupportedContentType(request: NextRequest): NextResponse | null {
  return request.headers.get("content-type")?.toLowerCase().startsWith("application/json")
    ? null
    : NextResponse.json(
        { error: "Content-Type non supportato" },
        { status: 415, headers: { "Cache-Control": "no-store" } },
      );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await hasValidId(params))) return invalidId();
  const session = await getSessionFromRequest(request);
  if (!session) return unauthenticated();
  return proxyToTjApi(request);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await hasValidId(params))) return invalidId();
  const session = await getSessionFromRequest(request);
  if (!session) return unauthenticated();
  const contentTypeError = unsupportedContentType(request);
  if (contentTypeError) return contentTypeError;
  return proxyToTjApi(request);
}

/** Compatibilità client che usano PATCH: stesso contratto di PUT verso tj-api. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await hasValidId(params))) return invalidId();
  const session = await getSessionFromRequest(request);
  if (!session) return unauthenticated();
  const contentTypeError = unsupportedContentType(request);
  if (contentTypeError) return contentTypeError;
  return proxyToTjApi(request, { methodOverride: "PUT" });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await hasValidId(params))) return invalidId();
  const session = await getSessionFromRequest(request);
  if (!session) return unauthenticated();
  return proxyToTjApi(request);
}
