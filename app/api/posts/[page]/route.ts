import { NextRequest, NextResponse } from "next/server";
import { fetchPostsPageFromWordPress } from "@/lib/api";
import { proxyToTjApi } from "@/lib/tjApiProxy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Campi che tj-api restituisce in lista ma che nessun consumatore usa.
 *
 * `content` è il corpo HTML completo dell'articolo: il client lo scaricava a
 * ogni "carica altri" senza mostrarlo mai (misurato: 28,9 KB per pagina da 10
 * post, quasi interamente content). Stessa rimozione fatta lato server in
 * `lib/api.ts` (`toListItem`), applicata qui al percorso client.
 */
const OMITTED_LIST_FIELDS = ["content", "link"] as const;

/** GET /api/posts/:page?category=… → proxy verso tj-api (wordpress-content). */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ page: string }> },
) {
  const { page } = await params;
  if (!/^[1-9]\d*$/.test(page)) {
    return NextResponse.json({ error: "Invalid page" }, { status: 400 });
  }
  const upstream = await proxyToTjApi(request);

  // Il backend Cloudflare normalmente media WordPress, ma un guasto nella
  // subrequest edge-to-edge non deve bloccare la paginazione del sito quando
  // l'origine WordPress è ancora sana. Il fallback scatta soltanto sui 5xx:
  // errori client e risposte valide continuano a provenire da tj-api.
  if (upstream.status >= 500) {
    const rawCategory = request.nextUrl.searchParams.get("category");
    const categoryId = rawCategory == null ? undefined : Number(rawCategory);
    const validCategoryId =
      categoryId !== undefined && Number.isInteger(categoryId) && categoryId > 0
        ? categoryId
        : undefined;
    try {
      const payload = await fetchPostsPageFromWordPress(
        Number(page),
        10,
        validCategoryId,
      );
      return NextResponse.json(payload, {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
          "X-TechJournal-Upstream": "wordpress-direct-fallback",
        },
      });
    } catch (error) {
      console.error("[posts proxy] fallback WordPress diretto fallito", error);
    }
  }

  // Solo risposte JSON riuscite vengono alleggerite: errori, redirect e
  // payload non-JSON passano intatti, con status e header originali.
  const contentType = upstream.headers.get("content-type") ?? "";
  if (!upstream.ok || !contentType.includes("application/json")) {
    return upstream;
  }

  let payload: { posts?: Array<Record<string, unknown>> } | null;
  try {
    payload = (await upstream.clone().json()) as typeof payload;
  } catch {
    // Corpo non parsabile: meglio inoltrarlo così com'è che rompere il client.
    return upstream;
  }
  if (!payload || !Array.isArray(payload.posts)) return upstream;

  const posts = payload.posts.map((post) => {
    const slim = { ...post };
    for (const field of OMITTED_LIST_FIELDS) delete slim[field];
    return slim;
  });

  // Header upstream preservati (cache-control, x-next-page, …): cambia solo il body.
  const headers = new Headers(upstream.headers);
  headers.delete("content-length");
  return NextResponse.json({ ...payload, posts }, { status: upstream.status, headers });
}
