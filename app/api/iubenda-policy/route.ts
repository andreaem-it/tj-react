import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy per l'API iubenda Direct Text Embedding (Privacy / Cookie policy).
 * Richiede piano Advanced o Ultimate e policy in versione Pro.
 * Vedi: https://www.iubenda.com/en/help/78-privacy-policy-direct-text-embedding-api/
 *
 * Gli id accettati sono limitati a una whitelist (IUBENDA_POLICY_IDS,
 * comma-separated) con fallback agli id già referenziati nel codice
 * (NEXT_PUBLIC_IUBENDA_SITE_ID / NEXT_PUBLIC_IUBENDA_COOKIE_POLICY_ID):
 * evita di usare il proxy come relay verso iubenda per id arbitrari.
 */
function getAllowedPolicyIds(): Set<string> {
  const fromEnv = (process.env.IUBENDA_POLICY_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (fromEnv.length > 0) return new Set(fromEnv);

  const fallback = [
    process.env.NEXT_PUBLIC_IUBENDA_SITE_ID?.trim(),
    process.env.NEXT_PUBLIC_IUBENDA_COOKIE_POLICY_ID?.trim(),
  ].filter((v): v is string => Boolean(v));
  return new Set(fallback);
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id")?.trim() ?? "";
  const type = request.nextUrl.searchParams.get("type"); // "privacy" | "cookie"

  if (!id) {
    return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 });
  }

  const allowedIds = getAllowedPolicyIds();
  if (!allowedIds.has(id)) {
    return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });
  }

  const encodedId = encodeURIComponent(id);
  const path =
    type === "cookie"
      ? `privacy-policy/${encodedId}/cookie-policy`
      : `privacy-policy/${encodedId}`;
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
  } catch {
    return NextResponse.json(
      { success: false, error: "Network error" },
      { status: 502 }
    );
  }
}
