import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { listAllCompatibilityMatrix, withDb } from "@/lib/compatibility/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  try {
    const matrix = withDb((db) => listAllCompatibilityMatrix(db));
    return NextResponse.json({ matrix });
  } catch (e) {
    console.error("[admin/compatibility/matrix]", e);
    return NextResponse.json({ error: "Errore server" }, { status: 500 });
  }
}
