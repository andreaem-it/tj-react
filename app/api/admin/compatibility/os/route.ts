import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { parseOsInput } from "@/lib/compatibility/parseBody";
import { insertOs, listOperatingSystems, withDb } from "@/lib/compatibility/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  try {
    const operatingSystems = withDb((db) => listOperatingSystems(db));
    return NextResponse.json({ operatingSystems });
  } catch (e) {
    console.error("[admin/compatibility/os GET]", e);
    return NextResponse.json({ error: "Errore server" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const input = parseOsInput(body);
    if (!input) {
      return NextResponse.json({ error: "Payload non valido" }, { status: 400 });
    }
    const os = withDb((db) => insertOs(db, input));
    return NextResponse.json({ os }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("UNIQUE") || msg.includes("constraint")) {
      return NextResponse.json({ error: "Slug già in uso" }, { status: 409 });
    }
    console.error("[admin/compatibility/os POST]", e);
    return NextResponse.json({ error: "Errore server" }, { status: 500 });
  }
}
