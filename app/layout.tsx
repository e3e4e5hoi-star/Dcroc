import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Dcroc Exchange — DEX + CEX',
  description: 'Dcroc Exchange: a simulated DEX + CEX with real token prices, Redis-backed portfolio, and secure Google sign-in.',
  openGraph: {
    title: 'Dcroc Exchange',
    description: 'Dcroc Exchange combines simulated DEX swaps and CEX trading with real token prices.',
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
