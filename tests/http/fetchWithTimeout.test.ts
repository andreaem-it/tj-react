import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import test from "node:test";
import { fetchWithTimeout } from "../../lib/http/fetchWithTimeout";

test("deadline aborts a body that stalls after headers arrive", async () => {
  const server = createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.write('{"partial":');
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const res = await fetchWithTimeout(`http://127.0.0.1:${address.port}`, {}, 100);
    assert.equal(res.status, 200);
    await assert.rejects(res.text(), /abort|timeout/i);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test("caller cancellation is preserved", async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(fetchWithTimeout("http://127.0.0.1:1", { signal: controller.signal }), /abort/i);
});
