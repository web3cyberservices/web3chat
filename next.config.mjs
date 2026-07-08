/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  serverExternalPackages: ['pg'],
  images: {
    unoptimized: true,
  },
  experimental: {
    turbopack: {}
  }
};

export default nextConfig;