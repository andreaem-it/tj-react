import type { Queue } from "@opennextjs/aws/types/overrides.js";

/** Keep durable deduplication normally; regenerate directly only when its
 * Free quota is exhausted. This fallback is best-effort and deduplicated per
 * isolate by OpenNext's memory queue, then retried on the next stale read.
 */
export function withQuotaFallback(primary: Queue, fallback: Queue): Queue {
  return {
    name: "durable-queue-with-quota-fallback",
    async send(message) {
      try {
        await primary.send(message);
      } catch (error) {
        if (!(error instanceof Error) ||
            !/Exceeded allowed volume of requests in Durable Objects free tier/i.test(error.message)) {
          throw error;
        }
        console.warn("[isr] Durable Objects quota exhausted; using direct revalidation");
        await fallback.send(message);
      }
    },
  };
}
