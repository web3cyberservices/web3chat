import type {Metadata} from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'HumangoBot | Official Web Crawler Identity & Compliance',
  description: 'Verified identity and verification portal for HumangoBot. Auditing global infrastructure for GDPR compliance, SSL/TLS security, and data privacy protocols.',
  keywords: 'HumangoBot, web crawler, security audit, GDPR compliance, SSL scanner, Cloudflare verified bot',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%233b82f6%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><path d=%22M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z%22></path></svg>',
  },
  openGraph: {
    title: 'HumangoBot | Identity Portal',
    description: 'Official crawler specifications and GDPR compliance standards.',
    url: 'https://bot.humango.app',
    siteName: 'HumangoBot',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-body antialiased selection:bg-primary/30">{children}</body>
    </html>
  );
}
