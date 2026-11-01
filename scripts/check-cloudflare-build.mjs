import fs from "node:fs";

const config = JSON.parse(fs.readFileSync("wrangler.production.jsonc", "utf8"));

if (config.name !== "tj-react") {
  throw new Error("Cloudflare guard failed: expected the tj-react Worker.");
}
if (config.workers_dev !== true || config.routes || config.custom_domains) {
  throw new Error("Cloudflare guard failed: tj-react must remain workers.dev-only.");
}
if (config.durable_objects || config.migrations || config.r2_buckets || config.d1_databases) {
  throw new Error("Cloudflare guard failed: unprovisioned storage bindings are not allowed.");
}
if (config.vars?.TJ_API_BASE_URL !== "https://backend.techjournal.it") {
  throw new Error("Cloudflare guard failed: unexpected backend URL.");
}
if (!fs.existsSync(".open-next/worker.js")) {
  throw new Error("Missing OpenNext bundle. Run npm run cf:build:production first.");
}

console.log("Cloudflare guard passed: binding-free tj-react bundle.");
