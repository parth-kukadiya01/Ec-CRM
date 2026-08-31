import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'RBS — Enterprise Order Management Platform',
  description: 'Enterprise Order & Business Operations Dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#f1f5f9] text-slate-800 antialiased">
        {children}
      </body>
    </html>
  );
}
