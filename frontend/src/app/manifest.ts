import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Campify Campus Hub',
    short_name: 'Campify',
    description: 'India\'s Premium Campus Social & Collaboration Platform for Students.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#121212',
    theme_color: '#FF6B35',
    icons: [
      {
        src: '/logo.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  };
}
