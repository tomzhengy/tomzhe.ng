import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export", // For static site generation with Cloudflare Pages
  images: {
    unoptimized: true,
  },
  // Disable ESLint during builds
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
