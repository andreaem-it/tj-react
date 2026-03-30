import { NextRequest, NextResponse } from "next/server";
import { parseStatus } from "@/lib/compatibility/filters";
import { getOsDetailBySlug, withDb } from "@/lib/compatibility/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const decoded = decodeURIComponent(slug);
    const status = parseStatus(request.nextUrl.searchParams.get("status"));
    const data = withDb((db) =>
      getOsDetailBySlug(db, decoded, status ? { status } : undefined),
    );
    if (!data) {
      return NextResponse.json({ error: "Sistema operativo non trovato" }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (e) {
    console.error("[compatibility/os]", e);
    return NextResponse.json({ error: "Errore nel caricamento" }, { status: 500 });
  }
}
