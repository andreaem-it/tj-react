import { NextResponse } from "next/server";

/**
 * Evita che `app/[slug]/page.tsx` intercetti `/og-default.png` e chiami
 * `GET .../post/og-default.png` su WordPress.
 *
 * Serve un'immagine da URL configurabile (CDN / asset statico 1200×630 consigliato).
 */
const UPSTREAM =
  process.env.OG_DEFAULT_IMAGE_URL?.trim() ||
  process.env.NEXT_PUBLIC_OG_DEFAULT_IMAGE_URL?.trim() ||
  "https://static.techjournal.it/2024/01/logo-techjournal-250.png";

export async function GET() {
  try {
    const res = await fetch(UPSTREAM, {
      headers: { Accept: "image/*", "User-Agent": "TechJournal-OGDefault/1.0" },
      next: { revalidate: 86_400 },
    });
    if (!res.ok) {
      return new NextResponse(null, { status: 502 });
    }
    const contentType = res.headers.get("content-type") ?? "image/png";
    return new NextResponse(res.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
