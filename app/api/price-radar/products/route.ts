import { NextRequest, NextResponse } from "next/server";
import { isPriceRadarDbConfigured } from "@/lib/priceRadar/db";
import { listProducts, type ListProductsParams } from "@/lib/priceRadar/productQueries";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isPriceRadarDbConfigured()) {
    return NextResponse.json(
      { error: "Price Radar: database SQLite non inizializzato. Esegui npm run price-radar:init." },
      { status: 503 }
    );
  }
  try {
    const sp = request.nextUrl.searchParams;
    const search = sp.get("search") ?? sp.get("q") ?? undefined;
    const sortRaw = sp.get("sort");
    const sort =
      sortRaw === "price" || sortRaw === "newest" || sortRaw === "priority"
        ? sortRaw
        : "discount";
    const pr = sp.get("priority");
    const priority =
      pr === "hot" || pr === "warm" || pr === "cold" || pr === "all" ? pr : "all";
    const params: ListProductsParams = { search, sort, priority };
    const products = await listProducts(params);
    return NextResponse.json({ products });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
