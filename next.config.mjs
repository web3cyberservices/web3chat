/** @type {import('next').NextConfig} */
const nextConfig = {
  /* Standalone mode is disabled to support custom server.js with full node_modules */
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