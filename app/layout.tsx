import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MarketcalV2',
  description: 'MarketcalV2 Saasable app shell'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className="font-sans">{children}</body>
    </html>
  );
}
