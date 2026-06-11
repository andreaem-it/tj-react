import { NextResponse } from "next/server";
import { ImageResponse } from "next/og";
import { createElement } from "react";

/**
 * Evita che `app/[slug]/page.tsx` intercetti `/og-default.png` e chiami
 * `GET .../post/og-default.png` su WordPress.
 *
 * Se `OG_DEFAULT_IMAGE_URL` è configurata serve quell'asset (CDN, 1200×630
 * consigliato); altrimenti genera dinamicamente un'immagine brand 1200×630
 * con `ImageResponse` (runtime Node.js: niente edge, la route resta `.png`).
 */
const UPSTREAM =
  process.env.OG_DEFAULT_IMAGE_URL?.trim() ||
  process.env.NEXT_PUBLIC_OG_DEFAULT_IMAGE_URL?.trim() ||
  null;

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const CACHE_CONTROL =
  "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800";

/** Colori brand: vedi app/globals.css (--background dark / --accent). */
const BRAND_BACKGROUND = "#1a1a1a";
const BRAND_ACCENT = "#f5a623";
const BRAND_MUTED = "#a3a3a3";

function renderFallbackImage(): ImageResponse {
  return new ImageResponse(
    createElement(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: BRAND_BACKGROUND,
        },
      },
      createElement(
        "div",
        { style: { display: "flex", alignItems: "baseline" } },
        createElement(
          "span",
          { style: { fontSize: 110, fontWeight: 700, color: BRAND_ACCENT } },
          "Tech"
        ),
        createElement(
          "span",
          { style: { fontSize: 110, fontWeight: 700, color: "#ffffff" } },
          "Journal"
        )
      ),
      createElement("div", {
        style: {
          width: 220,
          height: 8,
          marginTop: 28,
          marginBottom: 28,
          backgroundColor: BRAND_ACCENT,
          borderRadius: 4,
        },
      }),
      createElement(
        "span",
        { style: { fontSize: 36, color: BRAND_MUTED } },
        "Notizie su Apple, Tech e Gadget"
      )
    ),
    {
      width: OG_WIDTH,
      height: OG_HEIGHT,
      headers: {
        "Cache-Control": CACHE_CONTROL,
      },
    }
  );
}

export async function GET() {
  if (UPSTREAM) {
    try {
      const res = await fetch(UPSTREAM, {
        headers: { Accept: "image/*", "User-Agent": "TechJournal-OGDefault/1.0" },
        next: { revalidate: 86_400 },
      });
      if (res.ok) {
        const contentType = res.headers.get("content-type") ?? "image/png";
        return new NextResponse(res.body, {
          status: 200,
          headers: {
            "Content-Type": contentType,
            "Cache-Control": CACHE_CONTROL,
          },
        });
      }
    } catch {
      // Upstream irraggiungibile: si passa al fallback generato.
    }
  }
  return renderFallbackImage();
}
