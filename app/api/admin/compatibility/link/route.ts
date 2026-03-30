import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { parseLinkInput } from "@/lib/compatibility/parseBody";
import { insertCompatibility, withDb } from "@/lib/compatibility/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const input = parseLinkInput(body);
    if (!input) {
      return NextResponse.json({ error: "Payload non valido" }, { status: 400 });
    }
    const link = withDb((db) => insertCompatibility(db, input));
    return NextResponse.json({ link }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("UNIQUE") || msg.includes("constraint")) {
      return NextResponse.json(
        { error: "Combinazione dispositivo/OS già presente" },
        { status: 409 },
      );
    }
    console.error("[admin/compatibility/link POST]", e);
    return NextResponse.json({ error: "Errore server" }, { status: 500 });
  }
}
