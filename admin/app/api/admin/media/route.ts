import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { listMedia } from "@/lib/db/media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const perPage = Math.min(100, Math.max(1, Number(searchParams.get("perPage")) || 24));
  const month = searchParams.get("month") || "";

  const { items, total, availableMonths } = await listMedia({
    page,
    perPage,
    month: month || undefined,
  });

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(page, totalPages);

  return NextResponse.json({
    items,
    total,
    page: safePage,
    perPage,
    totalPages,
    availableMonths,
    currentMonth: month || "",
  });
}
