/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    allowedDevOrigins: [
      '6000-firebase-studio-1777733792819.cluster-4cmpbiopffe5oqk7tloeb2ltrk.cloudworkstations.dev',
      'localhost:9002',
      '0.0.0.0:9002'
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  }
};

export default nextConfig;