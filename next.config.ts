import type { NextConfig } from "next";

/**
 * Safe-by-default: bypass `/_next/image` to avoid production outages when
 * external image optimization returns 402 (quota/billing).
 *
 * Set NEXT_IMAGE_PASSTHROUGH=0 to explicitly re-enable Next/Vercel optimizer.
 */
const usePassthroughImageLoader = process.env.NEXT_IMAGE_PASSTHROUGH !== "0";

const nextConfig: NextConfig = {
  transpilePackages: ["@mep-agency/next-iubenda"],
  async rewrites() {
    return [
      {
        source: "/embed.json",
        destination: "/api/iubenda-embed",
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*\\.(svg|png|jpg|jpeg|webp|avif|ico|woff2)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=2592000",
          },
        ],
      },
    ];
  },
  images: {
    ...(usePassthroughImageLoader
      ? {
          /** Modalità fallback: evita `/_next/image` quando necessario. */
          loader: "custom" as const,
          loaderFile: "./lib/passthrough-image-loader.ts",
        }
      : {}),
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
