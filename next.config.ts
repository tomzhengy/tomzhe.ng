import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export", // For static site generation with Cloudflare Pages
  images: {
    unoptimized: true, // Required for static exports
    // Image cache optimization settings
    minimumCacheTTL: 31536000, // Cache optimized images for 1 year
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },
  // Disable ESLint during builds
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
