import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Remove 'output: export' to enable dynamic rendering
  // This allows pages to be generated on-demand for any company/filing
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
