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

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("i");
  if (!id) {
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
        const data = await res.json().catch(() => ({}));
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
