import assert from "node:assert/strict";
import test from "node:test";
import type { QueueMessage } from "@opennextjs/aws/types/overrides.js";
import { withQuotaFallback } from "../../cloudflare/revalidation-queue";

const message = { MessageBody: { host: "www.techjournal.it", url: "/" }, MessageGroupId: "home", MessageDeduplicationId: "home-v1" } as QueueMessage;

test("healthy durable queue never uses direct revalidation", async () => {
  let direct = 0;
  const queue = withQuotaFallback({ name: "durable", async send(received) { assert.equal(received, message); } }, { name: "memory", async send() { direct++; } });
  await queue.send(message);
  assert.equal(direct, 0);
});

test("quota exhaustion falls back with the original revalidation message", async () => {
  let received: QueueMessage | undefined;
  const queue = withQuotaFallback({ name: "durable", async send() { throw new Error("Exceeded allowed volume of requests in Durable Objects free tier."); } }, { name: "memory", async send(msg) { received = msg; } });
  await queue.send(message);
  assert.equal(received, message);
});

test("unrelated errors propagate without duplicate revalidation", async () => {
  let direct = 0;
  const failure = new Error("invalid binding");
  const queue = withQuotaFallback({ name: "durable", async send() { throw failure; } }, { name: "memory", async send() { direct++; } });
  await assert.rejects(queue.send(message), failure);
  assert.equal(direct, 0);
});
