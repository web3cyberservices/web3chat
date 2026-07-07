/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    // В Next.js 16/Canary тип может не распознаваться TSC, но рантайм его поддерживает
    allowedDevOrigins: [
      '6000-firebase-studio-1777733792819.cluster-4cmpbiopffe5oqk7tloeb2ltrk.cloudworkstations.dev'
    ]
  },
  typescript: {
    ignoreBuildErrors: true
  },
  eslint: {
    ignoreDuringBuilds: true
  }
};

export default nextConfig;
