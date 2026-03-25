import { NextRequest, NextResponse } from "next/server";
import { isPriceRadarDbConfigured } from "@/lib/priceRadar/db";
import { parseHistoryRangeParam } from "@/lib/priceRadar/historyRange";
import { getPriceHistory, getProductById } from "@/lib/priceRadar/productQueries";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  if (!isPriceRadarDbConfigured()) {
    return NextResponse.json({ error: "Price Radar DB non configurato" }, { status: 503 });
  }
  const { id: idStr } = await params;
  const id = Number.parseInt(idStr, 10);
  if (!Number.isFinite(id) || id < 1) {
    return NextResponse.json({ error: "ID non valido" }, { status: 400 });
  }
  const range = parseHistoryRangeParam(request.nextUrl.searchParams.get("range"));
  try {
    if (!(await getProductById(id))) {
      return NextResponse.json({ error: "Prodotto non trovato" }, { status: 404 });
    }
    const data = await getPriceHistory(id, range);
    return NextResponse.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
