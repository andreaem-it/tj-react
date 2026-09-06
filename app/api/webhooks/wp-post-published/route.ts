import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { proxyToTjApi } from "@/lib/tjApiProxy";
import { fetchPostBySlug, getCategoryUrlSlugFromWpSlug, type PostWithMeta } from "@/lib/api";
import { contentPathsFor, purgeCloudflare, revalidateContent } from "@/lib/cacheInvalidation";
import { classifyArticleTopics } from "@/lib/content/enrich";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;
const MAX_WEBHOOK_BODY_BYTES = 1024 * 1024;

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
 * Risolve una volta sola il post appena pubblicato.
 *
 * Serve sia all'invalidazione della cache (categoria per il path frontend
 * `/{categoria}/{slug}`) sia all'arricchimento del payload inoltrato a
 * tj-api (topic, classificazione): prima erano due fetch identiche per due
 * scopi diversi. `null` se lo slug non si ricava dal payload o la fetch
 * fallisce — ognuno dei due usi ha il proprio fallback.
 */
async function resolvePublishedPost(payload: WpPublishedPayload): Promise<PostWithMeta | null> {
  const slug = slugFromPermalink(payload.link);
  if (!slug) return null;
  try {
    return await fetchPostBySlug(slug);
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
async function invalidateForPublishedPost(
  request: NextRequest,
  payload: WpPublishedPayload,
  post: PostWithMeta | null,
): Promise<void> {
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

  const target = {
    slug: slugFromPermalink(payload.link),
    categoryUrlSlug: post ? getCategoryUrlSlugFromWpSlug(post.categorySlug) : null,
  };
  const revalidated = revalidateContent(target);
  const purge = await purgeCloudflare(contentPathsFor(target));

  console.log(
    `[webhook] cache invalidata per post ${payload.wp_post_id ?? "?"} ` +
      `(${revalidated.join(", ")}) — Cloudflare: ${purge.status}` +
      (purge.status !== "ok" ? ` (${purge.reason})` : ""),
  );
}

/**
 * Arricchisce il payload WP con topic e classificazione (§46): tj-api può
 * targettizzare le notifiche push per argomento senza dover reimplementare lì
 * il matching NLP che vive solo in questo repository. `null` se il post non
 * si è risolto o la classificazione fallisce — il chiamante allora inoltra il
 * payload originale, invariato: l'arricchimento è un'aggiunta, mai una
 * condizione per l'inoltro (che è anche l'autopost social).
 */
function buildEnrichedPayload(
  payload: WpPublishedPayload,
  post: PostWithMeta | null,
): (WpPublishedPayload & { topics: string[]; contentType: string; reliability: string }) | null {
  if (!post) return null;
  try {
    const { contentType, reliability, topicSlugs } = classifyArticleTopics({
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      categorySlug: post.categorySlug,
    });
    return { ...payload, topics: topicSlugs, contentType, reliability };
  } catch {
    return null;
  }
}

/**
 * POST → invalidazione cache + inoltro a tj-api (autopost social, e ora anche
 * targeting per le notifiche push).
 *
 * Un'unica risoluzione del post alimenta entrambi gli usi: se non si
 * risolve, ciascuno degrada al proprio comportamento di sempre invece di far
 * fallire l'intera richiesta.
 */
export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_WEBHOOK_BODY_BYTES) {
    return NextResponse.json(
      { error: "Payload too large" },
      { status: 413, headers: { "Cache-Control": "no-store" } },
    );
  }
  let payload: WpPublishedPayload = {};
  try {
    const rawPayload = await request.clone().text();
    if (Buffer.byteLength(rawPayload, "utf8") > MAX_WEBHOOK_BODY_BYTES) {
      return NextResponse.json(
        { error: "Payload too large" },
        { status: 413, headers: { "Cache-Control": "no-store" } },
      );
    }
    payload = JSON.parse(rawPayload) as WpPublishedPayload;
  } catch {
    // Payload illeggibile: si prosegue con l'inoltro originale, senza arricchimento.
  }

  const post = await resolvePublishedPost(payload);

  try {
    await invalidateForPublishedPost(request, payload, post);
  } catch (e) {
    // Nessun errore di invalidazione deve impedire l'autopost.
    console.error("[webhook] invalidazione cache fallita:", e);
  }

  const enriched = buildEnrichedPayload(payload, post);

  return proxyToTjApi(request, {
    timeoutMs: 120_000,
    ...(enriched ? { bodyOverride: enriched } : {}),
  });
}
