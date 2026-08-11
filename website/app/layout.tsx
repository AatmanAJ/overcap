import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = "https://overcap.dev";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Overcap — AI coding usage, in one place",
    template: "%s — Overcap",
  },
  description:
    "Track usage and limits across Claude Code, Codex, Cursor, Copilot and more from one private desktop app.",
  applicationName: "Overcap",
  authors: [{ name: "AIWITHAJ", url: "https://aiwithaj.dev" }],
  creator: "AIWITHAJ",
  publisher: "AIWITHAJ",
  alternates: { canonical: "/" },
  keywords: [
    "AI coding tools",
    "usage tracker",
    "Claude Code limits",
    "Codex limits",
    "Cursor usage",
    "desktop app",
  ],
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Overcap",
    title: "Overcap — Know your AI coding limits",
    description: "Track usage and limits across your AI coding tools.",
    images: [
      {
        url: "/media/overcap-social.png",
        width: 1200,
        height: 630,
        alt: "Overcap desktop usage dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Overcap — Know your AI coding limits",
    description: "Track usage and limits across your AI coding tools.",
    images: ["/media/overcap-social.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/overcap-icon.svg",
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#141414",
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
