import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { parseDeviceInput } from "@/lib/compatibility/parseBody";
import { insertDevice, listDevices, withDb } from "@/lib/compatibility/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  try {
    const devices = withDb((db) => listDevices(db));
    return NextResponse.json({ devices });
  } catch (e) {
    console.error("[admin/compatibility/device GET]", e);
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
    const input = parseDeviceInput(body);
    if (!input) {
      return NextResponse.json({ error: "Payload non valido" }, { status: 400 });
    }
    const device = withDb((db) => insertDevice(db, input));
    return NextResponse.json({ device }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("UNIQUE") || msg.includes("constraint")) {
      return NextResponse.json({ error: "Slug già in uso" }, { status: 409 });
    }
    console.error("[admin/compatibility/device POST]", e);
    return NextResponse.json({ error: "Errore server" }, { status: 500 });
  }
}
