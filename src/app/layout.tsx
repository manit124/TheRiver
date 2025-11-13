import type { Metadata } from 'next';
import '@/styles/globals.css';
import { RetroGrid } from '@/components/RetroGrid';
import NavHeader from '@/components/NavHeader';

export const metadata: Metadata = {
  title: 'TheRiver',
  description: 'Multi-variant poker game platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-black">
        <RetroGrid className="fixed inset-0" />
        <NavHeader />
        <div className="relative z-10 pt-20 pb-20 sm:pb-0">{children}</div>
      </body>
    </html>
  );
}

