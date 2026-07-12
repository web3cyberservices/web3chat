import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Web3CyberServices - Secure Ecosystem',
    short_name: 'Web3Cyber',
    description: 'Anonymous and secure decentralized communication and tools ecosystem.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0d0d12',
    theme_color: '#b3f2c9',
    categories: ['communication', 'security', 'social'],
    icons: [
      {
        src: 'https://picsum.photos/seed/web3chat-192/192/192',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: 'https://picsum.photos/seed/web3chat-512/512/512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    screenshots: [
      {
        src: 'https://picsum.photos/seed/ss1/1280/720',
        sizes: '1280x720',
        type: 'image/png',
        label: 'Desktop Interface'
      },
      {
        src: 'https://picsum.photos/seed/ss2/720/1280',
        sizes: '720x1280',
        type: 'image/png',
        label: 'Mobile Interface'
      }
    ]
  }
}
