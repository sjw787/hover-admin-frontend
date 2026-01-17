import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,

  // For Amplify WEB_COMPUTE deployment
  // Using default Next.js output (not standalone or export)
  // Amplify will handle the server deployment

  images: {
    // Required for external S3 images
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 's3.*.amazonaws.com',
      },
    ],
  },
};

export default nextConfig;
