import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "www.techjournal.it", pathname: "/**" },
      { protocol: "https", hostname: "static.techjournal.it", pathname: "/**" },
    ],
  },
};

export default nextConfig;
