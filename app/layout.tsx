import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'TY26 — Shotokan Advanced Karate',
  description: 'TY26 is the information and competition platform for Shotokan Advanced karate athletes and clubs.',
  openGraph: {
    title: 'TY26 — Shotokan Advanced Karate',
    description: 'Track athletes, clubs, rankings, events, and transfers across Shotokan Advanced karate.',
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
