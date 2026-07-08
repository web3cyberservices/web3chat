/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  // Изолируем драйвер pg от Webpack, чтобы избежать ошибок с нативными модулями при сборке
  serverExternalPackages: ['pg'],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;