import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  distDir: 'out',
  images: {
    unoptimized: true
  },
  // Fix the turbopack root directory warning
  turbopack: {
    root: '/home/benjamin/Documenten/ecom-trader'
  }
};

export default nextConfig;
