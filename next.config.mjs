/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    // allowedDevOrigins удален, так как он не распознается в этой версии canary
  },
  // Пустой конфиг turbopack для устранения ошибки несовместимости с webpack-настройками
  turbopack: {}
};

export default nextConfig;
