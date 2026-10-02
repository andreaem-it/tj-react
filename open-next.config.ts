import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import incrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import doQueue from "@opennextjs/cloudflare/overrides/queue/do-queue";
import memoryQueue from "@opennextjs/cloudflare/overrides/queue/memory-queue";
import cacheQueue from "@opennextjs/cloudflare/overrides/queue/queue-cache";
import d1TagCache from "@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache";
import doShardedTagCache from "@opennextjs/cloudflare/overrides/tag-cache/do-sharded-tag-cache";
import { withRegionalCache } from "@opennextjs/cloudflare/overrides/incremental-cache/regional-cache";
import { withQuotaFallback } from "./cloudflare/revalidation-queue";

// Production uses D1 for invalidation timestamps so each page read no longer
// spends the shared Durable Objects Free request quota. Preview stays isolated.
export default defineCloudflareConfig({
  incrementalCache: withRegionalCache(incrementalCache, { mode: "short-lived" }),
  enableCacheInterception: true,
  queue: cacheQueue(withQuotaFallback(doQueue, memoryQueue), { waitForQueueAck: true }),
  tagCache: process.env.CLOUDFLARE_PREVIEW === "1"
    ? doShardedTagCache({ baseShardSize: 1 })
    : d1TagCache,
});
