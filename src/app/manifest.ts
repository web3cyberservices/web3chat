
import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Web3 Chat',
    short_name: 'Web3Chat',
    description: 'Secure and anonymous decentralized communication',
    start_url: '/',
    display: 'standalone',
    background_color: '#0d0d12',
    theme_color: '#b3f2c9',
    icons: [
      {
        src: 'https://picsum.photos/seed/web3chat-pwa-192/192/192',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: 'https://picsum.photos/seed/web3chat-pwa-512/512/512',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
