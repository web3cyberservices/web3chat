/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  serverExternalPackages: ['pg'],
  images: {
    unoptimized: true,
  },
  // Turbopack config should be at the root, not inside experimental
  turbopack: {},
};

export default nextConfig;
