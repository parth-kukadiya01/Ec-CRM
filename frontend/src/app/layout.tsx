import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CRM Suite — Enterprise B2B Management Platform',
  description: 'Enterprise-grade CRM platform with Inventory, Orders, Procurement, Shipment Tracking, Employee RBAC, and Account Management modules.',
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
