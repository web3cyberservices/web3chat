/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  serverExternalPackages: ['pg'], // <-- КРИТИЧЕСКИ ВАЖНО: Защита от ошибок pg-native
  images: {
    unoptimized: true,
  },
};

export default nextConfig;