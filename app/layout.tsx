import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'BIU Network — Independent Blockchain Infrastructure',
  description: 'CROC is a community token presented on the Robinhood network. Verify the contract address and network data before interacting.',
  openGraph: {
    title: 'BIU Network — Independent Blockchain Infrastructure',
    description: 'CROC token on Robinhood network — public contract reference and project information.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
