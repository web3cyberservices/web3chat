/** @type {import('next').NextConfig} */
const nextConfig = {
  /* Кастомный сервер требует стандартного билда (output: standalone удален) */
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
    ],
  },
};

export default nextConfig;