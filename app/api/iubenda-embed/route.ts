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

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("i");
  if (!id) {
    return NextResponse.json({}, { status: 200 });
  }

  const candidates = [
    `${IUBENDA_ORIGINS[0]}/embed.json?i=${id}`,
    `${IUBENDA_ORIGINS[1]}/embed.json?i=${id}`,
    `${IUBENDA_ORIGINS[0]}/api/embed.json?i=${id}`,
    `${IUBENDA_ORIGINS[0]}/privacy-policy/${id}/embed.json`,
  ];

  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        next: { revalidate: 300 },
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
    }
  }

  return NextResponse.json({}, {
    status: 200,
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
