import { NextResponse } from "next/server";
import { isPriceRadarAdminConfigured, isPriceRadarAdminRequest } from "@/lib/priceRadar/adminAuth";
import { isPriceRadarDbConfigured } from "@/lib/priceRadar/db";
import { getAdminStatus } from "@/lib/priceRadar/adminQueries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
}

export async function GET(_request: Request): Promise<NextResponse> {
  if (!isPriceRadarAdminConfigured()) {
    return NextResponse.json(
      { error: "PRICE_RADAR_ADMIN_SECRET non configurato sul sito" },
      { status: 503 }
    );
  }
  if (!isPriceRadarAdminRequest(_request)) {
    return unauthorized();
  }
  if (!isPriceRadarDbConfigured()) {
    return NextResponse.json(
      {
        dbConfigured: false,
        productCount: 0,
        activeCount: 0,
        pausedCount: 0,
        batchSize: 8,
        error: "Database Price Radar non inizializzato",
      },
      { status: 200 }
    );
  }
  try {
    const status = await getAdminStatus();
    return NextResponse.json(status);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
