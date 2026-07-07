/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    // В Next.js 16/15+ это свойство позволяет обходить CORS-ограничения в облачных редакторах
    allowedDevOrigins: [
      '6000-firebase-studio-1777733792819.cluster-4cmpbiopffe5oqk7tloeb2ltrk.cloudworkstations.dev',
      'localhost:3000',
      'localhost:9002'
    ]
  },
  webpack: (config) => {
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      'bufferutil': 'commonjs bufferutil',
    });
    return config;
  },
};

export default nextConfig;
