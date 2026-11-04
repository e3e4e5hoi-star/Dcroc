import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'BIU Network — Independent Blockchain Infrastructure',
  description: 'BIU Network is a proposed independent Avalanche L1 with BIU as its proposed native gas coin.',
  openGraph: {
    title: 'BIU Network — Independent Blockchain Infrastructure',
    description: 'A proposed independent EVM-compatible Avalanche L1 for builders.',
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
