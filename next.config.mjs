/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  turbopack: {}, // Теперь в корне, как требует Next.js 16
  serverExternalPackages: ['pg'],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;