import { NextRequest, NextResponse } from "next/server";
import { getDeviceDetailBySlug, withDb } from "@/lib/compatibility/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const decoded = decodeURIComponent(slug);
    const data = withDb((db) => getDeviceDetailBySlug(db, decoded));
    if (!data) {
      return NextResponse.json({ error: "Dispositivo non trovato" }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (e) {
    console.error("[compatibility/device]", e);
    return NextResponse.json({ error: "Errore nel caricamento" }, { status: 500 });
  }
}
