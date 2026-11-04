import type { NextConfig } from "next";

// Images on static.techjournal.it use the custom Cloudflare Worker loader.
// Local and third-party images keep their original URL.
const nextConfig: NextConfig = {
  // The home aggregates several cached upstream reads. Cloudflare builds must
  // tolerate a transient slow origin without failing the whole release.
  staticPageGenerationTimeout: 180,
  // Avoid overwhelming the shared content API during preview prerendering.
  ...(process.env.CLOUDFLARE_PREVIEW === "1" ? {
    experimental: { cpus: 2, staticGenerationMaxConcurrency: 2 },
  } : {}),
  transpilePackages: ["@mep-agency/next-iubenda"],
  async redirects() {
    return [
      // Preserve SEO equity from the former nested WordPress permalink scheme.
      // Put AMP/feed variants first so they land on the canonical article URL.
      {
        source: "/:category/:slug/amp",
        destination: "/:category/:slug",
        permanent: true,
      },
      {
        source: "/:category/:slug/feed",
        destination: "/:category/:slug",
        permanent: true,
      },
      ...["apple", "applicazioni", "games"].flatMap((section) => [
        {
          source: `/${section}/:category/:path+/amp`,
          destination: "/:category/:path+",
          permanent: true,
        },
        {
          source: `/${section}/:category/:path+/feed`,
          destination: "/:category/:path+",
          permanent: true,
        },
        {
          source: `/${section}/:category/:path+`,
          destination: "/:category/:path+",
          permanent: true,
        },
      ]),
      {
        source: "/:category/:path+/amp",
        destination: "/:category/:path+",
        permanent: true,
      },
      {
        source: "/:category/:path+/feed",
        destination: "/:category/:path+",
        permanent: true,
      },
    ];
  },
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
    ];
  },
  async headers() {
    const securityHeaders = [
      ...(process.env.CLOUDFLARE_PREVIEW === "1" ? [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] : []),
      { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
      {
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains; preload",
      },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    ];

    return [
      {
        source: "/",
        headers: [
          // Keep browser caching under Next.js control while allowing the
          // Cloudflare edge to serve the public homepage without invoking the
          // Worker on every request. Stale content is refreshed in background.
          {
            key: "Cloudflare-CDN-Cache-Control",
            value: "public, max-age=300, stale-while-revalidate=3600, stale-if-error=86400",
          },
          ...securityHeaders,
        ],
      },
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/manifest.webmanifest",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, immutable",
          },
          { key: "Content-Type", value: "application/manifest+json; charset=utf-8" },
          ...securityHeaders,
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
    loader: "custom",
    loaderFile: "./lib/cloudflareImageLoader.ts",
    deviceSizes: [320, 480, 640, 768, 960, 1200, 1600, 1920],
    imageSizes: [48, 64, 96, 128, 256, 384],
    remotePatterns: [
      { protocol: "https", hostname: "www.techjournal.it", pathname: "/**" },
      { protocol: "https", hostname: "backend.techjournal.it", pathname: "/**" },
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
