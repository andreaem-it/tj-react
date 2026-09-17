import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import incrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import queue from "@opennextjs/cloudflare/overrides/queue/do-queue";
import doShardedTagCache from "@opennextjs/cloudflare/overrides/tag-cache/do-sharded-tag-cache";

// Preview resources are isolated from the production CDN and content databases.
export default defineCloudflareConfig({
  incrementalCache,
  queue,
  tagCache: doShardedTagCache({ baseShardSize: 1 }),
});
