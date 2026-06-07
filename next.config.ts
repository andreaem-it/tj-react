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
      /** GA gtag.js via first-party (TLS solo verso www.techjournal.it). */
      {
        source: "/3p/gtag/js",
        destination: "https://www.googletagmanager.com/gtag/js",
      },
      /** AdSense loader via first-party. */
      {
        source: "/3p/ads/pagead/js/adsbygoogle.js",
        destination: "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js",
      },
      /** Microsoft Clarity tag via first-party. */
      {
        source: "/3p/clarity/tag/:id",
        destination: "https://www.clarity.ms/tag/:id",
      },
    ];
  },
  async headers() {
    const securityHeaders = [
      { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    ];

    return [
      {
        source: "/manifest.webmanifest",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, immutable",
          },
          { key: "Content-Type", value: "application/manifest+json; charset=utf-8" },
        ],
      },
      {
        source: "/:path*\\.(svg|png|jpg|jpeg|webp|avif|ico|woff2)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=2592000",
          },
          ...securityHeaders,
        ],
      },
      {
        source: "/3p/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/docs",
        headers: securityHeaders,
      },
    ];
  },
  images: {
    ...(usePassthroughImageLoader
      ? {
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
