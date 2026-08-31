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
    authApi.getMe().then((res) => setCurrentUser(res.data)).catch(() => { });
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
      // { name: 'Tasks', href: '/dashboard/tasks', icon: CheckSquare, perm: 'dashboard' },
      // { name: 'Inventory', href: '/dashboard/inventory', icon: Package, perm: 'inventory:read' },
      { name: 'Orders', href: '/dashboard/orders', icon: ShoppingCart, perm: 'orders:read' },
      // { name: 'Purchases', href: '/dashboard/purchases', icon: ShoppingBag, perm: 'purchases:read' },
      { name: 'Shipments', href: '/dashboard/shipments', icon: Truck, perm: 'shipments:read' },
    ];

    return items.filter((item) => {
      if (isPartner && item.name === 'Tasks & Tickets') return false;
      return hasPermission(currentUser, item.perm);
    });
  };

  const getFilteredAdminItems = () => {
    const items = [
      { name: 'Accounts', href: '/dashboard/accounts', icon: Building2, perm: 'accounts:read' },
      { name: 'Companies & Partners', href: '/dashboard/companies-partners', icon: Store, perm: 'accounts:read' },
      // { name: 'Employees', href: '/dashboard/employees', icon: Users, perm: 'employees:read' },
      // { name: 'Channel Partners', href: '/dashboard/partners', icon: Store, perm: 'employees:read' },
      // { name: 'Expense Claims', href: '/dashboard/expenses', icon: Receipt, perm: 'employees:read' },
      // { name: 'Finance', href: '/dashboard/finance', icon: IndianRupee, perm: 'finance:admin' },
      { name: 'Roles & Permissions', href: '/dashboard/roles', icon: ShieldCheck, perm: 'roles:manage' },
    ];

    return items.filter((item) => {
      if (item.perm === 'accounts:read') return isAdmin || hasPermission(currentUser, item.perm);
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
        className={`nav-link flex items-center gap-3 px-3 py-2 text-[13px] font-medium transition-all group relative ${isActive
          ? 'bg-[#2271b1] text-white font-semibold shadow-xs'
          : 'text-slate-300 hover:text-white hover:bg-[#2c3338]'
          }`}
      >
        {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#72aee6]" />}
        <div className={`flex items-center justify-center w-[26px] h-[26px] rounded-sm transition-all ${isActive
          ? 'text-white'
          : 'text-slate-400 group-hover:text-white'
          }`}>
          <Icon className="w-[16px] h-[16px]" />
        </div>
        <span className="flex-1 truncate">{item.name}</span>
        {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/80" />}
      </Link>
    );
  };

  return (
    <aside className="w-[240px] bg-[#1d2327] text-slate-200 flex flex-col justify-between h-screen sticky top-0 shrink-0 dark-scrollbar overflow-y-auto border-r border-[#2c3338]">
      <div>
        {/* WordPress Style Brand Header */}
        <div className="px-4 pt-4 pb-3 flex items-center gap-3 bg-[#1d2327] border-b border-[#2c3338]">
          <div className="w-8 h-8 rounded bg-[#2271b1] flex items-center justify-center text-white font-bold text-sm shadow-xs border border-white/20">
            RBS
          </div>
          <div>
            <h1 className="font-bold text-[15px] text-white tracking-tight leading-tight">RBS Suite</h1>
            <p className="text-[10px] text-[#72aee6] font-semibold tracking-wider uppercase">WP Admin Dashboard</p>
          </div>
        </div>

        {/* Main Navigation */}
        <div className="py-2">
          <div className="px-3 py-1.5 mb-1 bg-[#101517]/40 border-b border-[#2c3338]">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Main Menu</span>
          </div>
          <nav className="space-y-0.5">
            {visibleNavItems.map(renderNavItem)}
          </nav>
        </div>

        {/* Admin Section */}
        {visibleAdminNavItems.length > 0 && (
          <div className="py-2 border-t border-[#2c3338]">
            <div className="px-3 py-1.5 mb-1 bg-[#101517]/40 border-b border-[#2c3338]">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Administration</span>
            </div>
            <nav className="space-y-0.5">
              {visibleAdminNavItems.map(renderNavItem)}
            </nav>
          </div>
        )}
      </div>

      {/* Bottom Section */}
      <div className="p-3 bg-[#181d20] border-t border-[#2c3338]">
        {/* User Info Card */}
        {currentUser && (
          <Link href="/dashboard/profile" className="block mb-2 p-2.5 rounded bg-[#2c3338] border border-white/5 hover:border-[#2271b1] transition-all cursor-pointer">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded bg-[#2271b1] flex items-center justify-center text-white font-bold text-[11px]">
                {(currentUser.full_name || currentUser.email || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold text-white truncate">{currentUser.full_name || 'User'}</div>
                <div className="text-[10px] text-[#72aee6] font-medium truncate">
                  {currentUser.is_admin ? 'Super Admin' : currentUser.role_name || 'Employee'}
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* Sign Out */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded text-[12px] font-medium text-slate-300 hover:text-red-300 hover:bg-red-900/30 transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
