import { getTjApiBaseUrl } from "@/lib/config/tjApi";
import { buildWpTjRequestHeaders, WP_BASE } from "@/lib/constants";

const UPSTREAM_TIMEOUT_MS = 8_000;

function parseViewsPayload(data: unknown): number | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  for (const key of ["views", "count", "post_views"] as const) {
    const raw = o[key];
    const n = typeof raw === "number" ? raw : Number(raw);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return null;
}

async function requestViews(
  url: string,
  method: "GET" | "POST",
): Promise<{ ok: boolean; views: number | null }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  const init: RequestInit = {
    method,
    headers: { ...buildWpTjRequestHeaders() },
    cache: "no-store",
    signal: controller.signal,
  };
  if (method === "POST") {
    init.headers = { ...init.headers, "Content-Type": "application/json" };
    init.body = JSON.stringify({ increment: true });
  }

  try {
    const res = await fetch(url, init);
    if (!res.ok) return { ok: false, views: null };
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("application/json")) return { ok: false, views: null };
    const data = (await res.json()) as unknown;
    const views = parseViewsPayload(data);
    if (views == null) return { ok: false, views: null };
    return { ok: true, views };
  } catch {
    return { ok: false, views: null };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Legge o incrementa le visualizzazioni: prima Postgres via tj-api, poi fallback
 * sul plugin WordPress tj/v1 (stesso contratto usato prima della migrazione).
 */
export async function fetchPostViewsCount(postId: number): Promise<number | null> {
  const base = getTjApiBaseUrl();
  if (base) {
    const upstream = await requestViews(`${base}/api/views/${postId}`, "GET");
    if (upstream.ok && upstream.views != null) return upstream.views;
  }

  const wp = await requestViews(`${WP_BASE}/views/${postId}`, "GET");
  return wp.ok && wp.views != null ? wp.views : null;
}

export async function incrementPostViewsCount(postId: number): Promise<number | null> {
  const base = getTjApiBaseUrl();
  if (base) {
    const upstream = await requestViews(`${base}/api/views/${postId}`, "POST");
    if (upstream.ok && upstream.views != null) return upstream.views;
  }

  const wp = await requestViews(`${WP_BASE}/views/${postId}`, "POST");
  return wp.ok && wp.views != null ? wp.views : null;
}
