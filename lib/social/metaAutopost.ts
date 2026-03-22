/**
 * Pubblicazione su Facebook Page feed e Instagram (Graph API).
 * Richiede token con pages_manage_posts e instagram_content_publish (IG).
 */

import { META_GRAPH_BASE } from "@/lib/meta/graphConstants";

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function postFacebookPageFeed(params: {
  pageId: string;
  pageAccessToken: string;
  message: string;
  link: string;
}): Promise<{ postId: string }> {
  const body = new URLSearchParams();
  body.set("access_token", params.pageAccessToken);
  body.set("message", params.message.slice(0, 5000));
  body.set("link", params.link);

  const res = await fetch(`${META_GRAPH_BASE}${params.pageId}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    cache: "no-store",
  });
  const json = (await res.json()) as { id?: string; error?: { message?: string } };
  if (!res.ok || json.error) {
    throw new Error(json.error?.message ?? `Facebook HTTP ${res.status}`);
  }
  if (!json.id) throw new Error("Facebook: risposta senza id post");
  return { postId: json.id };
}

export async function postInstagramPhoto(params: {
  instagramUserId: string;
  pageAccessToken: string;
  imageUrl: string;
  caption: string;
}): Promise<{ mediaId: string }> {
  const body = new URLSearchParams();
  body.set("access_token", params.pageAccessToken);
  body.set("image_url", params.imageUrl);
  body.set("caption", params.caption.slice(0, 2200));

  const createRes = await fetch(`${META_GRAPH_BASE}${params.instagramUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    cache: "no-store",
  });
  const createJson = (await createRes.json()) as {
    id?: string;
    error?: { message?: string };
  };
  if (!createRes.ok || createJson.error) {
    throw new Error(createJson.error?.message ?? `Instagram media HTTP ${createRes.status}`);
  }
  const creationId = createJson.id;
  if (!creationId) throw new Error("Instagram: nessun creation id");

  for (let i = 0; i < 45; i++) {
    const stRes = await fetch(
      `${META_GRAPH_BASE}${creationId}?fields=status_code&access_token=${encodeURIComponent(params.pageAccessToken)}`,
      { cache: "no-store" }
    );
    const st = (await stRes.json()) as {
      status_code?: string;
      status?: string;
      error?: { message?: string };
    };
    if (st.error) throw new Error(st.error.message ?? "Instagram status error");
    if (st.status_code === "FINISHED") break;
    if (st.status_code === "ERROR") {
      throw new Error(st.status ?? "Instagram container ERROR");
    }
    await sleep(2000);
  }

  const pub = new URLSearchParams();
  pub.set("access_token", params.pageAccessToken);
  pub.set("creation_id", creationId);

  const pubRes = await fetch(`${META_GRAPH_BASE}${params.instagramUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: pub.toString(),
    cache: "no-store",
  });
  const pubJson = (await pubRes.json()) as {
    id?: string;
    error?: { message?: string };
  };
  if (!pubRes.ok || pubJson.error) {
    throw new Error(pubJson.error?.message ?? `Instagram publish HTTP ${pubRes.status}`);
  }
  if (!pubJson.id) throw new Error("Instagram: publish senza id");
  return { mediaId: pubJson.id };
}

export function buildSocialCaption(title: string, excerpt: string | undefined, link: string): string {
  const parts = [title.trim()];
  if (excerpt?.trim()) {
    parts.push("");
    parts.push(excerpt.trim().slice(0, 1800));
  }
  parts.push("");
  parts.push(link);
  return parts.join("\n").slice(0, 2200);
}
