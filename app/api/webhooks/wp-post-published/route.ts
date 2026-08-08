import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";
import { proxyToTjApi } from "@/lib/tjApiProxy";
import { fetchPostBySlug, getCategoryUrlSlugFromWpSlug } from "@/lib/api";
import { contentPathsFor, purgeCloudflare, revalidateContent } from "@/lib/cacheInvalidation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Payload inviato dal plugin WP (`class-tj-social-webhook.php`). */
type WpPublishedPayload = {
  wp_post_id?: number;
  title?: string;
  link?: string;
};

/**
 * Confronto a tempo costante su digest di uguale lunghezza: evita di far
 * trapelare la lunghezza del secret oltre che il contenuto.
 */
function secretMatches(received: string, expected: string): boolean {
  const a = createHash("sha256").update(received).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/** Ultimo segmento non vuoto del permalink WordPress = slug del post. */
function slugFromPermalink(link: string | undefined): string | null {
  if (!link) return null;
  try {
    const segments = new URL(link).pathname.split("/").filter(Boolean);
    const last = segments.at(-1);
    return last && last.length > 0 ? decodeURIComponent(last) : null;
  } catch {
    return null;
  }
}

/**
 * Invalida le cache per l'articolo appena pubblicato.
 *
 * Gated dal secret: `revalidatePath` forza la rigenerazione di pagine costose,
 * quindi un endpoint aperto sarebbe un amplificatore di carico a costo zero per
 * chi lo chiama. Senza `WP_WEBHOOK_SECRET` configurato l'invalidazione viene
 * saltata, non eseguita in chiaro.
 */
async function invalidateForPublishedPost(request: NextRequest): Promise<void> {
  const expected = process.env.WP_WEBHOOK_SECRET?.trim();
  if (!expected) {
    console.warn(
      "[webhook] WP_WEBHOOK_SECRET non configurato: invalidazione cache saltata " +
        "(l'autopost social continua a funzionare, la verifica è a monte su tj-api).",
    );
    return;
  }

  const received = request.headers.get("x-tj-webhook-secret");
  if (!received || !secretMatches(received, expected)) {
    console.warn("[webhook] secret non valido: invalidazione cache saltata.");
    return;
  }

  let payload: WpPublishedPayload = {};
  try {
    payload = (await request.json()) as WpPublishedPayload;
  } catch {
    // Payload illeggibile: si invalidano comunque i tag e la home.
  }

  const slug = slugFromPermalink(payload.link);
  let categoryUrlSlug: string | null = null;
  if (slug) {
    try {
      // Il payload non porta la categoria: va risolta dall'API per costruire
      // il path frontend `/{categoria}/{slug}`.
      const post = await fetchPostBySlug(slug);
      if (post) categoryUrlSlug = getCategoryUrlSlugFromWpSlug(post.categorySlug);
    } catch {
      // Categoria non risolta: si invalidano tag e home, che è il grosso.
    }
  }

  const target = { slug, categoryUrlSlug };
  const revalidated = revalidateContent(target);
  const purge = await purgeCloudflare(contentPathsFor(target));

  console.log(
    `[webhook] cache invalidata per post ${payload.wp_post_id ?? "?"} ` +
      `(${revalidated.join(", ")}) — Cloudflare: ${purge.status}` +
      (purge.status !== "ok" ? ` (${purge.reason})` : ""),
  );
}

/**
 * POST → invalidazione cache + inoltro a tj-api (autopost social).
 *
 * L'invalidazione legge il body da un clone, così lo stream originale resta
 * intatto per il proxy. Gira per prima perché è veloce, mentre l'inoltro a
 * tj-api può arrivare a 120s.
 */
export async function POST(request: NextRequest) {
  try {
    await invalidateForPublishedPost(request.clone() as NextRequest);
  } catch (e) {
    // Nessun errore di invalidazione deve impedire l'autopost.
    console.error("[webhook] invalidazione cache fallita:", e);
  }

  return proxyToTjApi(request, { timeoutMs: 120_000 });
}
