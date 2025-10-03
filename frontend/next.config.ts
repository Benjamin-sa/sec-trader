import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No static export - we need SSR for dynamic routes and fresh data
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  images: {
    unoptimized: true
  },
  // Fix the turbopack root directory warning
  turbopack: {
    root: '/home/benjamin/Documenten/ecom-trader'
  }
};

export default nextConfig;
