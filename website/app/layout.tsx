import type { Metadata, Viewport } from 'next';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/600.css';
import './globals.css';

const siteUrl = 'https://overcap.dev';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Overcap — See the limit before you hit it',
    template: '%s — Overcap',
  },
  description: 'Live quotas, reset times and spend across your coding tools.',
  applicationName: 'Overcap',
  authors: [{ name: 'Overcap', url: siteUrl }],
  creator: 'Overcap',
  publisher: 'Overcap',
  alternates: { canonical: '/' },
  keywords: [
    'coding tool usage',
    'quota monitor',
    'Claude Code limits',
    'Codex limits',
    'Cursor usage',
    'desktop app',
  ],
  openGraph: {
    type: 'website',
    url: siteUrl,
    siteName: 'Overcap',
    title: 'Overcap — See the limit before you hit it',
    description: 'Live quotas, reset times and spend across your coding tools.',
    images: [
      {
        url: '/media/overcap-social.png',
        width: 1200,
        height: 630,
        alt: 'Overcap desktop quota monitor',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Overcap — See the limit before you hit it',
    description: 'Live quotas, reset times and spend across your coding tools.',
    images: ['/media/overcap-social.png'],
  },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/overcap-icon.svg',
  },
};

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#f3f1ea',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
