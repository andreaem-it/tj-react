import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { fetchMegamenuFromTj } from "@/lib/api";

const CACHE_SECONDS = 300;

/** GET /api/megamenu/[slug] → post per megamenu da tj/v1 (cache 5 min). */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!slug || typeof slug !== "string") {
    return NextResponse.json({ error: "Slug mancante" }, { status: 400 });
  }

  try {
    const posts = await unstable_cache(
      () => fetchMegamenuFromTj(slug),
      ["megamenu", slug],
      { revalidate: CACHE_SECONDS, tags: ["megamenu"] }
    )();

    return NextResponse.json(posts, {
      headers: {
        "Cache-Control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=60`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/megamenu]", slug, message, err instanceof Error ? err.stack : "");
    return NextResponse.json([], { status: 200 });
  }
}
