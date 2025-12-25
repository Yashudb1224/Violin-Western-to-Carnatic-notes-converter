import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Carnatic Violin Notation Converter',
  description: 'Convert Western sheet music to Carnatic violin positions with real-time playback',
  keywords: ['carnatic', 'violin', 'music', 'notation', 'converter', 'indian classical'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={plusJakarta.className}>{children}</body>
    </html>
  );
}
