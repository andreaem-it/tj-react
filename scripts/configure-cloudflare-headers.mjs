import { existsSync, rmSync } from "node:fs";

const output = ".open-next/assets/_headers";

if (existsSync(output)) {
  rmSync(output);
  console.log("Preview-only Cloudflare headers removed.");
}
