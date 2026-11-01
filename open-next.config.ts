import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import incrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import doQueue from "@opennextjs/cloudflare/overrides/queue/do-queue";
import memoryQueue from "@opennextjs/cloudflare/overrides/queue/memory-queue";
import cacheQueue from "@opennextjs/cloudflare/overrides/queue/queue-cache";
import d1TagCache from "@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache";
import { withRegionalCache } from "@opennextjs/cloudflare/overrides/incremental-cache/regional-cache";
import { withQuotaFallback } from "./cloudflare/revalidation-queue";

export default defineCloudflareConfig({
  incrementalCache: withRegionalCache(incrementalCache, { mode: "short-lived" }),
  enableCacheInterception: true,
  queue: cacheQueue(withQuotaFallback(doQueue, memoryQueue), { waitForQueueAck: true }),
  tagCache: d1TagCache,
});
