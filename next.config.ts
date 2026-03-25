import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sql.js"],
  transpilePackages: ["@mep-agency/next-iubenda"],
  async rewrites() {
    return [
      {
        source: "/embed.json",
        destination: "/api/iubenda-embed",
      },
    ];
  },
  images: {
    /** Evita 402 su Vercel: nessuna richiesta a `/_next/image` (loader restituisce URL diretto). */
    loader: "custom",
    loaderFile: "./lib/passthrough-image-loader.ts",
    remotePatterns: [
      { protocol: "https", hostname: "www.techjournal.it", pathname: "/**" },
      { protocol: "https", hostname: "api.techjournal.it", pathname: "/**" },
      { protocol: "https", hostname: "static.techjournal.it", pathname: "/**" },
      { protocol: "https", hostname: "secure.gravatar.com", pathname: "/**" },
      { protocol: "https", hostname: "0.gravatar.com", pathname: "/**" },
      { protocol: "https", hostname: "1.gravatar.com", pathname: "/**" },
      { protocol: "https", hostname: "2.gravatar.com", pathname: "/**" },
      { protocol: "https", hostname: "images-na.ssl-images-amazon.com", pathname: "/**" },
      { protocol: "https", hostname: "m.media-amazon.com", pathname: "/**" },
      { protocol: "https", hostname: "images-eu.ssl-images-amazon.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
