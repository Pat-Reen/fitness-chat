import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        pathname: "/**",
      },
    ],
  },
  // Keep GCP Node.js clients server-side only
  serverExternalPackages: ["@google-cloud/firestore", "@google-cloud/storage"],
};

export default nextConfig;
