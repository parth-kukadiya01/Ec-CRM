import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CRM System - Modern Enterprise Management',
  description: 'Full stack CRM system with Inventory, Orders, Purchase, Shipment, Employee RBAC, and Account modules.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 antialiased selection:bg-blue-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
