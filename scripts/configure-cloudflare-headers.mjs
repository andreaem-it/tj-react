import { existsSync, rmSync, writeFileSync } from "node:fs";

const output = ".open-next/assets/_headers";

if (process.env.CLOUDFLARE_PREVIEW === "1") {
  writeFileSync(output, "/*\n  X-Robots-Tag: noindex, nofollow\n", "utf8");
  console.log("Cloudflare preview headers written.");
} else if (existsSync(output)) {
  rmSync(output);
  console.log("Preview-only Cloudflare headers removed.");
}
