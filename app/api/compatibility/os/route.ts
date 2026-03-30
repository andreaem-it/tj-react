import { NextRequest, NextResponse } from "next/server";
import { parseOsKind } from "@/lib/compatibility/filters";
import { listOperatingSystems, withDb } from "@/lib/compatibility/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const type = parseOsKind(request.nextUrl.searchParams.get("type"));
    const operatingSystems = withDb((db) =>
      listOperatingSystems(db, type ? { type } : undefined),
    );
    return NextResponse.json({ operatingSystems });
  } catch (e) {
    console.error("[compatibility/os list]", e);
    return NextResponse.json({ error: "Errore nel caricamento degli OS" }, { status: 500 });
  }
}
