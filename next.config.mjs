/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  serverExternalPackages: ['pg'],
  images: {
    unoptimized: true,
  },
  experimental: {
    // Удален turbopack отсюда, так как в v16 он настраивается иначе или через CLI
  }
};

export default nextConfig;