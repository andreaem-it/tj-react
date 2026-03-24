import { NextRequest, NextResponse } from "next/server";
import { isPriceRadarAdminConfigured, isPriceRadarAdminRequest } from "@/lib/priceRadar/adminAuth";
import { patchProductAdmin } from "@/lib/priceRadar/adminQueries";
import { isPriceRadarDbConfigured } from "@/lib/priceRadar/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  if (!isPriceRadarAdminConfigured()) {
    return NextResponse.json({ error: "PRICE_RADAR_ADMIN_SECRET non configurato" }, { status: 503 });
  }
  if (!isPriceRadarAdminRequest(request)) {
    return unauthorized();
  }
  if (!isPriceRadarDbConfigured()) {
    return NextResponse.json({ error: "Database non disponibile" }, { status: 503 });
  }
  const { id: raw } = await params;
  const id = Number.parseInt(raw, 10);
  if (!Number.isFinite(id) || id < 1) {
    return NextResponse.json({ error: "ID non valido" }, { status: 400 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON non valido" }, { status: 400 });
  }
  const o = body as Record<string, unknown>;
  const patch: Parameters<typeof patchProductAdmin>[1] = {};
  if (o.tracking_status === "active" || o.tracking_status === "paused") {
    patch.tracking_status = o.tracking_status;
  }
  if (typeof o.manual_boost === "number") {
    patch.manual_boost = o.manual_boost;
  }
  if (typeof o.article_mentions === "number") {
    patch.article_mentions = o.article_mentions;
  }
  if (o.check_now === true) {
    patch.check_now = true;
  }
  try {
    patchProductAdmin(id, patch);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore";
    const status = msg.includes("non trovato") ? 404 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
