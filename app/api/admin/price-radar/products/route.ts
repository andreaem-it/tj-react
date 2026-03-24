import { NextRequest, NextResponse } from "next/server";
import { isPriceRadarAdminConfigured, isPriceRadarAdminRequest } from "@/lib/priceRadar/adminAuth";
import { insertProductAdmin, listProductsAdmin } from "@/lib/priceRadar/adminQueries";
import { isPriceRadarDbConfigured } from "@/lib/priceRadar/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
}

function noDb(): NextResponse {
  return NextResponse.json({ error: "Database Price Radar non disponibile" }, { status: 503 });
}

export async function GET(request: NextRequest) {
  if (!isPriceRadarAdminConfigured()) {
    return NextResponse.json({ error: "PRICE_RADAR_ADMIN_SECRET non configurato" }, { status: 503 });
  }
  if (!isPriceRadarAdminRequest(request)) {
    return unauthorized();
  }
  if (!isPriceRadarDbConfigured()) {
    return noDb();
  }
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? undefined;
    const st = searchParams.get("status");
    const status =
      st === "active" || st === "paused" || st === "all" ? st : "all";
    const products = listProductsAdmin({ search, status });
    return NextResponse.json({ products });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isPriceRadarAdminConfigured()) {
    return NextResponse.json({ error: "PRICE_RADAR_ADMIN_SECRET non configurato" }, { status: 503 });
  }
  if (!isPriceRadarAdminRequest(request)) {
    return unauthorized();
  }
  if (!isPriceRadarDbConfigured()) {
    return noDb();
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON non valido" }, { status: 400 });
  }
  const o = body as Record<string, unknown>;
  const asin = typeof o.asin === "string" ? o.asin : "";
  const url = typeof o.url === "string" ? o.url : "";
  const title = typeof o.title === "string" ? o.title : null;
  try {
    const { id } = insertProductAdmin({ asin, url, title });
    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
