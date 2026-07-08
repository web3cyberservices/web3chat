/** @type {import('next').NextConfig} */
const nextConfig = {
  // Мы НЕ используем standalone режим здесь, так как у нас сложный кастомный server.js
  // и мы вручную управляем node_modules в Dockerfile для надежности.
  reactStrictMode: true,
  serverExternalPackages: ['pg'],
  images: {
    unoptimized: true,
  },
  experimental: {
    // Настройки для Next.js 16+
  }
};

export default nextConfig;