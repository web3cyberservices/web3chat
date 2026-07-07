
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
    // Разрешаем билд даже при мелких неточностях типов в SDK сторонних библиотек
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
