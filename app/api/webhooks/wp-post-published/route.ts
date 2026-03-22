import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { resolvePagePublishingContext } from "@/lib/meta/facebookPageContext";
import {
  ensureSocialAutopostSchema,
  getAutopostStatus,
  getTursoClient,
  upsertAutopostLog,
} from "@/lib/db/tursoSocial";
import { buildSocialCaption, postFacebookPageFeed, postInstagramPhoto } from "@/lib/social/metaAutopost";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const WEBHOOK_SECRET_HEADER = "x-tj-webhook-secret";

function verifyWebhookSecret(received: string | null, expected: string): boolean {
  if (!received || !expected) return false;
  try {
    const a = Buffer.from(received, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function isHttpsUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "https:";
  } catch {
    return false;
  }
}

type WpPayload = {
  wp_post_id: number;
  title: string;
  link: string;
  excerpt?: string;
  featured_image_url?: string;
};

/**
 * POST /api/webhooks/wp-post-published
 * Header: X-TJ-Webhook-Secret (uguale a WP_WEBHOOK_SECRET su Vercel)
 * Body JSON: { wp_post_id, title, link, excerpt?, featured_image_url? }
 */
export async function POST(request: NextRequest) {
  const secret = process.env.WP_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "WP_WEBHOOK_SECRET non configurato sul server" },
      { status: 503 }
    );
  }

  const receivedSecret =
    request.headers.get(WEBHOOK_SECRET_HEADER) ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    null;

  if (!verifyWebhookSecret(receivedSecret, secret)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const turso = getTursoClient();
  if (!turso) {
    return NextResponse.json(
      { error: "TURSO_DATABASE_URL / TURSO_AUTH_TOKEN mancanti" },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON non valido" }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const wpPostId = Number(o.wp_post_id ?? o.wpPostId);
  const title = typeof o.title === "string" ? o.title.trim() : "";
  const link = typeof o.link === "string" ? o.link.trim() : "";
  const excerpt = typeof o.excerpt === "string" ? o.excerpt.trim() : undefined;
  const featuredImageUrl =
    typeof o.featured_image_url === "string" ? o.featured_image_url.trim() : undefined;

  if (!Number.isInteger(wpPostId) || wpPostId < 1) {
    return NextResponse.json({ error: "wp_post_id obbligatorio (intero positivo)" }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ error: "title obbligatorio" }, { status: 400 });
  }
  if (!link || !isHttpsUrl(link)) {
    return NextResponse.json({ error: "link obbligatorio (URL https)" }, { status: 400 });
  }
  if (featuredImageUrl && !isHttpsUrl(featuredImageUrl)) {
    return NextResponse.json(
      { error: "featured_image_url deve essere https accessibile pubblicamente" },
      { status: 400 }
    );
  }

  const payload: WpPayload = {
    wp_post_id: wpPostId,
    title,
    link,
    excerpt,
    featured_image_url: featuredImageUrl,
  };

  const fbToken = process.env.FACEBOOK_ACCESS_TOKEN?.trim();
  if (!fbToken) {
    return NextResponse.json({ error: "FACEBOOK_ACCESS_TOKEN mancante" }, { status: 503 });
  }

  await ensureSocialAutopostSchema(turso);

  const pageRes = await resolvePagePublishingContext(fbToken);
  if (!pageRes.ok) {
    return NextResponse.json(
      { error: "Meta page context", detail: pageRes.message },
      { status: 502 }
    );
  }

  const { pageId, pageAccessToken, instagramUserId } = pageRes.ctx;
  const messageFb = excerpt
    ? `${title}\n\n${excerpt.slice(0, 4000)}`
    : title;
  const captionIg = buildSocialCaption(title, excerpt, link);

  const result: Record<string, unknown> = {
    wp_post_id: wpPostId,
    facebook: null as unknown,
    instagram: null as unknown,
  };

  // Facebook
  const fbExisting = await getAutopostStatus(turso, wpPostId, "facebook");
  if (fbExisting?.status === "success") {
    result.facebook = { skipped: true, remote_id: fbExisting.remote_id };
  } else {
    try {
      const fb = await postFacebookPageFeed({
        pageId,
        pageAccessToken,
        message: messageFb,
        link: payload.link,
      });
      await upsertAutopostLog(turso, wpPostId, "facebook", "success", fb.postId, null);
      result.facebook = { ok: true, post_id: fb.postId };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await upsertAutopostLog(turso, wpPostId, "facebook", "failed", null, msg);
      result.facebook = { ok: false, error: msg };
    }
  }

  // Instagram (richiede immagine pubblica HTTPS)
  const igExisting = await getAutopostStatus(turso, wpPostId, "instagram");
  if (igExisting?.status === "success") {
    result.instagram = { skipped: true, remote_id: igExisting.remote_id };
  } else if (!instagramUserId) {
    await upsertAutopostLog(
      turso,
      wpPostId,
      "instagram",
      "skipped",
      null,
      "Nessun Instagram Business collegato alla pagina"
    );
    result.instagram = { skipped: true, reason: "no_instagram_business_account" };
  } else if (!featuredImageUrl) {
    await upsertAutopostLog(
      turso,
      wpPostId,
      "instagram",
      "skipped",
      null,
      "featured_image_url mancante (obbligatorio per IG)"
    );
    result.instagram = { skipped: true, reason: "missing_featured_image" };
  } else {
    try {
      const ig = await postInstagramPhoto({
        instagramUserId,
        pageAccessToken,
        imageUrl: featuredImageUrl,
        caption: captionIg,
      });
      await upsertAutopostLog(turso, wpPostId, "instagram", "success", ig.mediaId, null);
      result.instagram = { ok: true, media_id: ig.mediaId };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await upsertAutopostLog(turso, wpPostId, "instagram", "failed", null, msg);
      result.instagram = { ok: false, error: msg };
    }
  }

  /** 200 = ricevuto ed elaborato (evita retry infiniti da WordPress); errori nel body. */
  return NextResponse.json(result, { status: 200 });
}
