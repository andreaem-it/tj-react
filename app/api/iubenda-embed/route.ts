import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy per embed.json richiesto da script iubenda (Cookie Solution).
 * Lo script fa fetch con URL relativa quindi la richiesta arriva al nostro origin;
 * senza questa route Next restituirebbe 404 HTML → "Unexpected token '<'".
 * Inoltriamo a iubenda e restituiamo JSON; in caso di errore restituiamo {} per evitare il crash.
 */
const IUBENDA_ORIGINS = [
  "https://www.iubenda.com",
  "https://cdn.iubenda.com",
];
const IUBENDA_ATTEMPT_TIMEOUT_MS = 3_000;
const MAX_EMBED_RESPONSE_BYTES = 512 * 1024;
const ALLOWED_POLICY_IDS = new Set(
  [
    ...(process.env.IUBENDA_POLICY_IDS ?? "").split(","),
    process.env.NEXT_PUBLIC_IUBENDA_SITE_ID,
    process.env.NEXT_PUBLIC_IUBENDA_COOKIE_POLICY_ID,
  ]
    .map((value) => value?.trim() ?? "")
    .filter(Boolean),
);

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("i")?.trim() ?? "";
  if (!id || ALLOWED_POLICY_IDS.size === 0 || !ALLOWED_POLICY_IDS.has(id)) {
    return NextResponse.json({}, { status: 200 });
  }
  const encodedId = encodeURIComponent(id);

  const candidates = [
    `${IUBENDA_ORIGINS[0]}/embed.json?i=${encodedId}`,
    `${IUBENDA_ORIGINS[1]}/embed.json?i=${encodedId}`,
    `${IUBENDA_ORIGINS[0]}/api/embed.json?i=${encodedId}`,
    `${IUBENDA_ORIGINS[0]}/privacy-policy/${encodedId}/embed.json`,
  ];

  for (const url of candidates) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), IUBENDA_ATTEMPT_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        next: { revalidate: 300 },
        signal: controller.signal,
      });
      if (res.ok) {
        const declaredLength = Number(res.headers.get("content-length"));
        if (Number.isFinite(declaredLength) && declaredLength > MAX_EMBED_RESPONSE_BYTES) {
          continue;
        }
        const text = await res.text();
        if (new TextEncoder().encode(text).byteLength > MAX_EMBED_RESPONSE_BYTES) continue;
        let data: unknown;
        try {
          data = JSON.parse(text);
        } catch {
          continue;
        }
        if (typeof data !== "object" || data === null || Array.isArray(data)) continue;
        return NextResponse.json(data, {
          headers: {
            "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
          },
        });
      }
    } catch {
      continue;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return NextResponse.json({}, {
    status: 200,
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
