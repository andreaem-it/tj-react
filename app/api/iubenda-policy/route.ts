import { NextRequest, NextResponse } from "next/server";

const IUBENDA_TIMEOUT_MS = 8_000;
const MAX_POLICY_RESPONSE_BYTES = 1024 * 1024;

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
// Calcolato una sola volta al caricamento del modulo (le env var sono immutabili a runtime).
const ALLOWED_POLICY_IDS: Set<string> = (() => {
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
})();

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id")?.trim() ?? "";
  const type = request.nextUrl.searchParams.get("type"); // "privacy" | "cookie"

  if (!id) {
    return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 });
  }

  if (type !== "privacy" && type !== "cookie") {
    return NextResponse.json({ success: false, error: "Invalid type" }, { status: 400 });
  }

  if (ALLOWED_POLICY_IDS.size === 0) {
    return NextResponse.json(
      { success: false, error: "Iubenda policy ids not configured" },
      { status: 503 },
    );
  }

  if (!ALLOWED_POLICY_IDS.has(id)) {
    return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });
  }

  const encodedId = encodeURIComponent(id);
  const path = type === "cookie"
    ? `privacy-policy/${encodedId}/cookie-policy`
    : `privacy-policy/${encodedId}`;
  const url = `https://www.iubenda.com/api/${path}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), IUBENDA_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
      signal: controller.signal,
    });
    const declaredLength = Number(res.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > MAX_POLICY_RESPONSE_BYTES) {
      return NextResponse.json(
        { success: false, error: "Upstream payload too large" },
        { status: 502 },
      );
    }
    const text = await res.text();
    if (new TextEncoder().encode(text).byteLength > MAX_POLICY_RESPONSE_BYTES) {
      return NextResponse.json(
        { success: false, error: "Upstream payload too large" },
        { status: 502 },
      );
    }
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid upstream response" },
        { status: 502 },
      );
    }

    if (!res.ok) {
      const upstreamError =
        typeof data === "object" && data !== null && "error" in data
          ? (data as { error?: unknown }).error
          : undefined;
      return NextResponse.json(
        { success: false, error: typeof upstreamError === "string" ? upstreamError : "Request failed" },
        { status: res.status }
      );
    }

    if (typeof data !== "object" || data === null || Array.isArray(data)) {
      return NextResponse.json(
        { success: false, error: "Invalid upstream response" },
        { status: 502 },
      );
    }

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
      },
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return NextResponse.json(
      { success: false, error: timedOut ? "Upstream timeout" : "Network error" },
      { status: timedOut ? 504 : 502 }
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
