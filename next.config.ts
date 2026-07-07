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
      "6000-firebase-studio-1777733792819.cluster-4cmpbiopffe5oqk7tloeb2ltrk.cloudworkstations.dev",
      "6000-firebase-studio-1777733792819.cluster-4cmpbiopffe5oqk7tloeb2ltrk.cloudworkstations.dev:9002",
      "*.cluster-4cmpbiopffe5oqk7tloeb2ltrk.cloudworkstations.dev",
      "*.cloudworkstations.dev"
    ]
  }
};

export default nextConfig;