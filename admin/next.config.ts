import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Evita warning Turbopack con package-lock nel repo monorepo (frontend + admin). */
const adminRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: { root: adminRoot },
  async redirects() {
    return [
      { source: "/admin/login", destination: "/login", permanent: true },
      { source: "/admin/articoli/:path*", destination: "/articoli/:path*", permanent: true },
      { source: "/admin/media", destination: "/media", permanent: true },
      { source: "/admin/categorie", destination: "/categorie", permanent: true },
      { source: "/admin/utenti", destination: "/utenti", permanent: true },
      { source: "/admin", destination: "/", permanent: true },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "static.techjournal.it", pathname: "/**" },
      { protocol: "https", hostname: "cdn.jsdelivr.net", pathname: "/**" },
    ],
  },
};

export default nextConfig;
