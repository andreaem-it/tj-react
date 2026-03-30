import { NextRequest, NextResponse } from "next/server";
import { parseDeviceType } from "@/lib/compatibility/filters";
import { listDevices, withDb } from "@/lib/compatibility/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  try {
    const type = parseDeviceType(request.nextUrl.searchParams.get("type"));
    const devices = withDb((db) => listDevices(db, type ? { type } : undefined));
    return NextResponse.json({ devices });
  } catch (e) {
    console.error("[compatibility/devices]", e);
    return NextResponse.json({ error: "Errore nel caricamento dei dispositivi" }, { status: 500 });
  }
}
