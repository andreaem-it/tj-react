import { NextResponse } from "next/server";
import { isPriceRadarDbConfigured } from "@/lib/priceRadar/db";
import { getDetailExtras, getProductById } from "@/lib/priceRadar/productQueries";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  if (!isPriceRadarDbConfigured()) {
    return NextResponse.json({ error: "Price Radar DB non configurato" }, { status: 503 });
  }
  const { id: idStr } = await params;
  const id = Number.parseInt(idStr, 10);
  if (!Number.isFinite(id) || id < 1) {
    return NextResponse.json({ error: "ID non valido" }, { status: 400 });
  }
  try {
    const product = await getProductById(id);
    if (!product) {
      return NextResponse.json({ error: "Prodotto non trovato" }, { status: 404 });
    }
    const extras = await getDetailExtras(id);
    return NextResponse.json({ product: { ...product, ...extras } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
