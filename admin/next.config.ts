import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Evita warning Turbopack con package-lock nel repo monorepo (frontend + admin). */
const adminRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: { root: adminRoot },
  transpilePackages: [
    "@blocknote/core",
    "@blocknote/react",
    "@blocknote/mantine",
  ],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "static.techjournal.it", pathname: "/**" },
      { protocol: "https", hostname: "cdn.jsdelivr.net", pathname: "/**" },
    ],
  },
};

export default nextConfig;
