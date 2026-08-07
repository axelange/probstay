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
  experimental: {
    serverActions: {
      // Signed contracts arrive as scans, and a scanned thirteen-page
      // agreement does not fit in the 1 MB a Server Action accepts by default.
      // The `signed-documents` bucket caps files at 25 MB; this leaves room
      // above that for the boundaries and part headers multipart/form-data
      // adds, which count against this limit too.
      //
      // It applies to every Server Action, not only the upload — the option is
      // global. See the note in signed-documents.tsx: moving the upload
      // straight to storage would let this go back down.
      bodySizeLimit: "26mb",
    },
  },
};

export default nextConfig;
