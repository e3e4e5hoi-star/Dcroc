import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'SwapX Exchange — Spot Crypto Markets',
  description: 'SwapX is an independent digital asset exchange with live market prices, spot trading, portfolio tools, and human-reviewed withdrawals.',
  openGraph: {
    title: 'SwapX Exchange — Spot Crypto Markets',
    description: 'Independent digital asset exchange with live markets, transparent risk controls, and secure funding workflows.',
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
