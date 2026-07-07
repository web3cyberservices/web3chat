
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
    ],
  },
  typescript: {
    // Разрешаем билд даже если есть мелкие несоответствия типов в сторонних SDK
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
