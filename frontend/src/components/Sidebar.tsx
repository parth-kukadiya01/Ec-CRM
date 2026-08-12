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
  Zap,
  ChevronRight,
  User,
  Receipt,
  CheckSquare,
  Store,
  IndianRupee,
} from 'lucide-react';
import { authApi } from '@/lib/api';
import { hasPermission } from '@/lib/permissions';

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

  const isAdmin = currentUser?.is_admin;

  const isPartner = currentUser?.is_partner || currentUser?.role_name === 'Channel Partner';

  // Filter Main Menu according to user granted permissions
  const getFilteredNavItems = () => {
    const items = [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, perm: 'dashboard' },
      { name: 'Tasks & Tickets', href: '/dashboard/tasks', icon: CheckSquare, perm: 'dashboard' },
      { name: 'Inventory', href: '/dashboard/inventory', icon: Package, perm: 'inventory:read' },
      { name: 'Orders', href: '/dashboard/orders', icon: ShoppingCart, perm: 'orders:read' },
      { name: 'Purchases', href: '/dashboard/purchases', icon: ShoppingBag, perm: 'purchases:read' },
      { name: 'Shipments', href: '/dashboard/shipments', icon: Truck, perm: 'shipments:read' },
    ];

    return items.filter((item) => {
      if (isPartner && item.name === 'Tasks & Tickets') return false;
      return item.perm === 'dashboard' || hasPermission(currentUser, item.perm);
    });
  };

  const getFilteredAdminItems = () => {
    const items = [
      { name: 'Employees', href: '/dashboard/employees', icon: Users, perm: 'employees:read' },
      { name: 'Channel Partners', href: '/dashboard/partners', icon: Store, perm: 'employees:read' },
      { name: 'Expense Claims', href: '/dashboard/expenses', icon: Receipt, perm: 'employees:read' },
      { name: 'Finance', href: '/dashboard/finance', icon: IndianRupee, perm: 'finance:admin' },
      { name: 'Roles & Permissions', href: '/dashboard/roles', icon: ShieldCheck, perm: 'roles:manage' },
    ];

    return items.filter((item) => {
      if (item.perm === 'finance:admin') return isAdmin;
      return hasPermission(currentUser, item.perm);
    });
  };

  const visibleNavItems = getFilteredNavItems();
  const visibleAdminNavItems = getFilteredAdminItems();

  const renderNavItem = (item: any) => {
    const Icon = item.icon;
    const isActive = pathname === item.href;
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`nav-link flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all group ${
          isActive
            ? 'active bg-white/[0.12] text-white'
            : 'text-blue-100/70 hover:text-white hover:bg-white/[0.06]'
        }`}
      >
        <div className={`flex items-center justify-center w-[30px] h-[30px] rounded-md transition-all ${
          isActive
            ? 'bg-white text-blue-700 shadow-sm'
            : 'bg-white/[0.06] text-blue-200/80 group-hover:text-white group-hover:bg-white/10'
        }`}>
          <Icon className="w-[15px] h-[15px]" />
        </div>
        <span className="flex-1 truncate">{item.name}</span>
        {isActive && <ChevronRight className="w-3.5 h-3.5 text-blue-300 opacity-80" />}
      </Link>
    );
  };

  return (
    <aside className="w-[248px] bg-gradient-to-b from-[#0f172a] via-[#0f1d38] to-[#0c1629] flex flex-col justify-between h-screen sticky top-0 shrink-0 dark-scrollbar overflow-y-auto border-r border-white/[0.06]">
      <div>
        {/* Brand Logo */}
        <div className="px-5 pt-5 pb-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white shadow-md shadow-blue-500/25">
            <Zap className="w-[18px] h-[18px] text-white" />
          </div>
          <div>
            <h1 className="font-bold text-[15px] text-white tracking-tight">CRM Suite</h1>
            <p className="text-[10px] text-blue-400 font-semibold tracking-widest uppercase">Enterprise B2B</p>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-5 mb-4 h-px bg-white/[0.06]" />

        {/* Main Navigation */}
        <div className="px-3">
          <div className="px-3 mb-2">
            <span className="text-[10px] font-bold text-blue-300/50 uppercase tracking-[0.1em]">Main Menu</span>
          </div>
          <nav className="space-y-0.5">
            {visibleNavItems.map(renderNavItem)}
          </nav>
        </div>

        {/* Admin Section */}
        {visibleAdminNavItems.length > 0 && (
          <div className="px-3 mt-6">
            <div className="px-3 mb-2">
              <span className="text-[10px] font-bold text-blue-300/50 uppercase tracking-[0.1em]">Administration</span>
            </div>
            <nav className="space-y-0.5">
              {visibleAdminNavItems.map(renderNavItem)}
            </nav>
          </div>
        )}
      </div>

      {/* Bottom Section */}
      <div className="p-3 mt-2">
        {/* User Info Card */}
        {currentUser && (
          <Link href="/dashboard/profile" className="block mb-2 p-3 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.07] hover:border-white/[0.1] transition-all cursor-pointer">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-[12px]">
                {(currentUser.full_name || currentUser.email || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold text-white truncate">{currentUser.full_name || 'User'}</div>
                <div className="text-[11px] text-blue-400/80 font-medium truncate">
                  {currentUser.is_admin ? 'Super Admin' : currentUser.role_name || 'Employee'}
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* Sign Out */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-blue-100/50 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
