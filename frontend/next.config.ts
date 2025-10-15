import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No static export - we need SSR for dynamic routes and fresh data
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  images: {
    unoptimized: true
  },

};

export default nextConfig;
