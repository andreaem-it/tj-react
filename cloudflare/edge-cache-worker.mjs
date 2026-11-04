import openNextWorker, {
  BucketCachePurge,
  DOQueueHandler,
  DOShardedTagCache,
} from "../.open-next/worker.js";

export { BucketCachePurge, DOQueueHandler, DOShardedTagCache };

const HOME_CACHE_KEY = "https://www.techjournal.it/__tj-edge-cache/home-v4";

function isPublicHomepageRequest(request) {
  if (request.method !== "GET") return false;

  const url = new URL(request.url);
  if (url.hostname !== "www.techjournal.it" || url.pathname !== "/" || url.search) {
    return false;
  }

  const headers = request.headers;
  if (
    headers.has("rsc") ||
    headers.has("next-router-state-tree") ||
    headers.has("next-router-prefetch") ||
    headers.get("purpose") === "prefetch"
  ) {
    return false;
  }

  const cookie = headers.get("cookie") ?? "";
  return !/(?:^|;\s*)(?:admin_session|wordpress_logged_in|__next_preview_data)=/i.test(cookie);
}

function withCacheStatus(response, status) {
  const headers = new Headers(response.headers);
  headers.set("X-TJ-Edge-Cache", status);
  // The shared edge cache keeps its own copy; browsers must always revalidate
  // so a publication or explicit purge is visible immediately.
  headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
  headers.delete("Cloudflare-CDN-Cache-Control");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request, env, ctx) {
    if (!isPublicHomepageRequest(request)) {
      return openNextWorker.fetch(request, env, ctx);
    }

    const cache = caches.default;
    const cacheKey = new Request(HOME_CACHE_KEY, { method: "GET" });
    const cached = await cache.match(cacheKey);
    if (cached) return withCacheStatus(cached, "HIT");

    const response = await openNextWorker.fetch(request, env, ctx);
    const contentType = response.headers.get("Content-Type") ?? "";
    if (
      response.status === 200 &&
      contentType.includes("text/html") &&
      !response.headers.has("Set-Cookie")
    ) {
      const cacheHeaders = new Headers(response.headers);
      cacheHeaders.set("Cache-Control", "public, max-age=300");
      cacheHeaders.set("Cloudflare-CDN-Cache-Control", "public, max-age=300");
      cacheHeaders.set("X-TJ-Edge-Cache", "MISS");
      const cacheable = new Response(response.clone().body, {
        status: response.status,
        statusText: response.statusText,
        headers: cacheHeaders,
      });
      ctx.waitUntil(cache.put(cacheKey, cacheable));
    }

    return withCacheStatus(response, "MISS");
  },
};
