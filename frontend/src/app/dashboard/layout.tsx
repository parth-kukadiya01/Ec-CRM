'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('crm_token');
    if (!token) {
      router.push('/');
    } else {
      setLoading(false);
    }
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Loading session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <main className="p-6 md:p-8 overflow-y-auto flex-1 bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
}
