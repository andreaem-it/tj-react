import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy per l'API iubenda Direct Text Embedding (Privacy / Cookie policy).
 * Richiede piano Advanced o Ultimate e policy in versione Pro.
 * Vedi: https://www.iubenda.com/en/help/78-privacy-policy-direct-text-embedding-api/
 */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  const type = request.nextUrl.searchParams.get("type"); // "privacy" | "cookie"

  if (!id?.trim()) {
    return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 });
  }

  const path =
    type === "cookie"
      ? `privacy-policy/${id}/cookie-policy`
      : `privacy-policy/${id}`;
  const url = `https://www.iubenda.com/api/${path}`;

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: (data as { error?: string }).error ?? "Request failed" },
        { status: res.status }
      );
    }

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: "Network error" },
      { status: 502 }
    );
  }
}
