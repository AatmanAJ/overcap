import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Overcap',
    short_name: 'Overcap',
    description: 'Live quotas, reset times and spend across your coding tools.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f3f1ea',
    theme_color: '#f3f1ea',
    icons: [{ src: '/overcap-icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
