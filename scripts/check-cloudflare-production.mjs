import fs from "node:fs";

const config = JSON.parse(fs.readFileSync("wrangler.production.jsonc", "utf8"));

if (config.name !== "tj-web" || config.workers_dev !== false) {
  throw new Error("Production guard failed: expected the tj-web production Worker.");
}
if (config.vars?.CLOUDFLARE_PREVIEW !== "0") {
  throw new Error("Production guard failed: preview mode must be disabled.");
}
if (!fs.existsSync(".open-next/worker.js")) {
  throw new Error("Missing production bundle. Run npm run cf:build:production first.");
}
if (fs.existsSync(".open-next/assets/_headers")) {
  throw new Error("Production bundle contains preview-only noindex headers.");
}
console.log("Production guard passed: tj-web bundle with preview mode disabled.");
