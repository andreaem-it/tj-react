import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "www.techjournal.it", pathname: "/**" },
      { protocol: "https", hostname: "static.techjournal.it", pathname: "/**" },
      { protocol: "https", hostname: "secure.gravatar.com", pathname: "/**" },
      { protocol: "https", hostname: "0.gravatar.com", pathname: "/**" },
      { protocol: "https", hostname: "1.gravatar.com", pathname: "/**" },
      { protocol: "https", hostname: "2.gravatar.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
