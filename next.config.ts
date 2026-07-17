import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Property photos are served from APIMO's CDN; the sync stores the
    // URLs rather than copying the files. remotePatterns (not the
    // deprecated `domains`) so the host is matched explicitly.
    remotePatterns: [
      { protocol: "https", hostname: "media.apimo.pro", pathname: "/**" },
    ],
  },
};

export default nextConfig;
