import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { parseDevicePatch } from "@/lib/compatibility/parseBody";
import { deleteDevice, updateDevice, withDb } from "@/lib/compatibility/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  const id = Number((await context.params).id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "ID non valido" }, { status: 400 });
  }
  try {
    const body = await request.json();
    const patch = parseDevicePatch(body);
    if (!patch || Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Nessun campo da aggiornare" }, { status: 400 });
    }
    const device = withDb((db) => updateDevice(db, id, patch));
    if (!device) {
      return NextResponse.json({ error: "Non trovato" }, { status: 404 });
    }
    return NextResponse.json({ device });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("UNIQUE") || msg.includes("constraint")) {
      return NextResponse.json({ error: "Slug già in uso" }, { status: 409 });
    }
    console.error("[admin/compatibility/device PATCH]", e);
    return NextResponse.json({ error: "Errore server" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const session = await getSessionFromRequest(_request);
  if (!session) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  const id = Number((await context.params).id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "ID non valido" }, { status: 400 });
  }
  try {
    const ok = withDb((db) => deleteDevice(db, id));
    if (!ok) {
      return NextResponse.json({ error: "Non trovato" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/compatibility/device DELETE]", e);
    return NextResponse.json({ error: "Errore server" }, { status: 500 });
  }
}
