/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  serverExternalPackages: ['pg'],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;