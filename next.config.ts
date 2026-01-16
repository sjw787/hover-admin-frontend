import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,

  // Static export disabled to support:
  // - Dynamic routes (e.g., /customers/[id])
  // - Client-side API calls with authentication
  // - Role-based routing
  // Deploy using: npm run build && npm start
  // or use a Node.js hosting platform (Vercel, AWS Amplify, etc.)

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
