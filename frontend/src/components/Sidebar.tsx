'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  ShoppingBag,
  Truck,
  Users,
  Building2,
  ShieldCheck,
  LogOut,
  Sparkles
} from 'lucide-react';
import { authApi } from '@/lib/api';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, adminOnly: false },
  { name: 'Inventory', href: '/dashboard/inventory', icon: Package, adminOnly: false },
  { name: 'Add & Manage Orders', href: '/dashboard/orders', icon: ShoppingCart, adminOnly: false },
  { name: 'Purchases', href: '/dashboard/purchases', icon: ShoppingBag, adminOnly: false },
  { name: 'Shipments', href: '/dashboard/shipments', icon: Truck, adminOnly: false },
  { name: 'Employees', href: '/dashboard/employees', icon: Users, adminOnly: true },
  { name: 'Accounts', href: '/dashboard/accounts', icon: Building2, adminOnly: true },
  { name: 'Roles & Permissions', href: '/dashboard/roles', icon: ShieldCheck, adminOnly: true },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    authApi.getMe().then((res) => setCurrentUser(res.data)).catch(() => {});
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('crm_token');
    window.location.href = '/';
  };

  const visibleNavItems = navItems.filter((item) => {
    if (item.adminOnly && currentUser && !currentUser.is_admin) {
      return false;
    }
    return true;
  });

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between h-screen sticky top-0 shrink-0 shadow-sm">
      <div>
        {/* App Logo */}
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-slate-900 tracking-wide">CRM Suite</h1>
            <p className="text-xs text-blue-600 font-semibold">Enterprise Platform</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-1">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200/60 shadow-xs'
                    : 'text-slate-600 font-medium hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Logout */}
      <div className="p-4 border-t border-slate-100">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-5 h-5 text-slate-400" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
