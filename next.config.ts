
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    allowedDevOrigins: [
      "localhost:3000",
      "localhost:9002",
      "0.0.0.0:3000",
      "0.0.0.0:9002",
      "*.cluster-4cmpbiopffe5oqk7tloeb2ltrk.cloudworkstations.dev",
      "*.cloudworkstations.dev"
    ]
  }
};

export default nextConfig;
