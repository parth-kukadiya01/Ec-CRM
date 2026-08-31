'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Shield,
  Bell,
  ChevronRight,
  AlertTriangle,
  ShoppingCart,
  Truck,
  CheckCheck,
  X,
  Info,
  ArrowRight,
  User,
  LogOut,
  Settings,
  ChevronDown,
  Layers
} from 'lucide-react';
import { authApi, inventoryApi, ordersApi } from '@/lib/api';

const pageTitles: { [key: string]: { title: string; breadcrumb: string[] } } = {
  '/dashboard': { title: 'Dashboard', breadcrumb: ['Home', 'Dashboard'] },
  '/dashboard/orders': { title: 'Orders Management', breadcrumb: ['Home', 'Orders'] },
  '/dashboard/purchases': { title: 'Purchases', breadcrumb: ['Home', 'Purchases'] },
  '/dashboard/shipments': { title: 'Shipments', breadcrumb: ['Home', 'Shipments'] },
  '/dashboard/roles': { title: 'Roles & Permissions', breadcrumb: ['Home', 'Roles'] },
  '/dashboard/profile': { title: 'My Profile', breadcrumb: ['Home', 'Profile'] },
};

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'alert' | 'order' | 'shipment' | 'info';
  read: boolean;
  link: string;
}

export default function Navbar() {
  const [userInfo, setUserInfo] = useState<any>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const pathname = usePathname();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  const loadNotifications = async () => {
    try {
      const meRes = await authApi.getMe().catch(() => ({ data: null }));
      setUserInfo(meRes?.data || null);

      const invRes = await inventoryApi.list().catch(() => ({ data: [] }));
      const ordRes = await ordersApi.list().catch(() => ({ data: [] }));

      const items: NotificationItem[] = [];

      const lowStock = (invRes.data || []).filter((item: any) => (item.stock_quantity || 0) <= 5);
      lowStock.forEach((item: any) => {
        items.push({
          id: `inv-${item.id}`,
          title: 'Low Stock Alert',
          message: `${item.product_name} is low in stock (${item.stock_quantity} units remaining)`,
          time: 'Just now',
          type: 'alert',
          read: false,
          link: '/dashboard/orders',
        });
      });

      const pendingOrders = (ordRes.data || []).filter((o: any) => o.status === 'Pending Review' || o.status === 'Pending Procurement');
      pendingOrders.forEach((ord: any) => {
        items.push({
          id: `ord-pending-${ord.id}`,
          title: 'Order Review Needed',
          message: `Order ${ord.order_number} (${ord.buyer_name || 'Buyer'}) requires review`,
          time: ord.order_date || 'Today',
          type: 'order',
          read: false,
          link: '/dashboard/orders',
        });
      });

      const readyOrders = (ordRes.data || []).filter((o: any) => o.status === 'Ready for Shipment' || o.status === 'Shipped');
      readyOrders.forEach((ord: any) => {
        items.push({
          id: `ord-ship-${ord.id}`,
          title: 'Dispatch Order',
          message: `Order ${ord.order_number} is ready for dispatch`,
          time: ord.order_date || 'Today',
          type: 'shipment',
          read: false,
          link: '/dashboard/shipments',
        });
      });

      if (items.length === 0) {
        items.push({
          id: 'sys-welcome',
          title: 'System Operational',
          message: 'All inventory stock levels and orders are up-to-date.',
          time: 'Today',
          type: 'info',
          read: true,
          link: '/dashboard',
        });
      }

      setNotifications(items);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleLogout = () => {
    localStorage.removeItem('crm_token');
    window.location.href = '/';
  };

  const pageInfo = pageTitles[pathname] || { title: 'Page', breadcrumb: ['Home'] };

  return (
    <header className="h-[46px] bg-[#1d2327] border-b border-[#2c3338] px-4 flex items-center justify-between sticky top-0 z-40 text-slate-200 select-none">
      
      {/* Left: RBS WP Admin Breadcrumbs & Toolbar */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 bg-[#2271b1] px-2.5 py-1 rounded-xs text-white text-[11px] font-bold shadow-xs">
          <Layers className="w-3.5 h-3.5" />
          <span>RBS Suite</span>
        </div>

        <nav className="flex items-center gap-1.5 text-xs">
          {pageInfo.breadcrumb.map((crumb, i) => (
            <React.Fragment key={i}>
              {i > 0 && <ChevronRight className="w-3 h-3 text-slate-500" />}
              <span className={i === pageInfo.breadcrumb.length - 1
                ? 'font-bold text-white text-[13px]'
                : 'text-slate-400 font-medium text-[12px]'
              }>
                {crumb}
              </span>
            </React.Fragment>
          ))}
        </nav>
      </div>

      {/* Right: Notifications & Proper WP User Dropdown */}
      <div className="flex items-center gap-2">

        {/* Notifications Button & Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => { setShowNotifications(!showNotifications); setShowUserDropdown(false); }}
            className={`relative p-1.5 rounded-xs text-slate-300 hover:text-white hover:bg-[#2c3338] transition-all ${
              showNotifications ? 'bg-[#2271b1] text-white' : ''
            }`}
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#72aee6] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2271b1] ring-1 ring-white" />
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute top-9 right-0 w-[340px] bg-white text-[#2c3338] border border-[#c3c4c7] shadow-xl z-50 rounded-xs overflow-hidden animate-fade-in font-sans">
              <div className="px-3.5 py-2 bg-[#1d2327] text-white border-b border-[#2c3338] flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-[#72aee6]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">System Activity Alerts</h3>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#2271b1] text-white">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-slate-400 hover:text-white font-bold"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto divide-y divide-[#dcdcde] text-xs">
                {notifications.map((n) => (
                  <div key={n.id} className="p-3 hover:bg-[#f6f7f7] transition-colors">
                    <div className="flex items-center justify-between font-bold text-[#1d2327] mb-0.5">
                      <span>{n.title}</span>
                      <span className="text-[10px] text-[#50575e] font-normal">{n.time}</span>
                    </div>
                    <p className="text-[11px] text-[#50575e] leading-tight">{n.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="h-4 w-px bg-[#3c434a]" />

        {/* PROPER WORDPRESS USER DROPDOWN MENU */}
        {userInfo && (
          <div className="relative" ref={userDropdownRef}>
            <button
              onClick={() => { setShowUserDropdown(!showUserDropdown); setShowNotifications(false); }}
              className={`flex items-center gap-2 px-2 py-1 rounded-xs hover:bg-[#2c3338] transition-all cursor-pointer ${
                showUserDropdown ? 'bg-[#2c3338]' : ''
              }`}
            >
              <div className="w-6 h-6 rounded-xs bg-[#2271b1] border border-white/20 flex items-center justify-center text-white font-bold text-[11px]">
                {(userInfo.full_name || 'U').charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-semibold text-white hidden sm:inline">{userInfo.full_name}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Dropdown Menu Container */}
            {showUserDropdown && (
              <div className="absolute top-9 right-0 w-[240px] bg-white text-[#2c3338] border border-[#c3c4c7] shadow-xl z-50 rounded-xs overflow-hidden animate-fade-in font-sans">
                
                {/* Header User Card */}
                <div className="p-3 bg-[#1d2327] text-white border-b border-[#2c3338]">
                  <div className="font-bold text-xs truncate">{userInfo.full_name}</div>
                  <div className="text-[10px] text-slate-300 truncate">{userInfo.email}</div>
                  <div className="mt-1.5 inline-block px-2 py-0.5 bg-[#2271b1] text-white text-[10px] font-bold rounded-xs uppercase">
                    {userInfo.is_admin ? 'Super Admin' : userInfo.role_name || 'Employee'}
                  </div>
                </div>

                {/* Dropdown Links */}
                <div className="py-1 text-xs divide-y divide-[#f0f0f1]">
                  <Link
                    href="/dashboard/profile"
                    onClick={() => setShowUserDropdown(false)}
                    className="flex items-center gap-2 px-3.5 py-2 text-[#2c3338] hover:bg-[#2271b1] hover:text-white transition-colors"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>My Account & Profile</span>
                  </Link>

                  <Link
                    href="/dashboard/orders"
                    onClick={() => setShowUserDropdown(false)}
                    className="flex items-center gap-2 px-3.5 py-2 text-[#2c3338] hover:bg-[#2271b1] hover:text-white transition-colors"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>Sales Orders Dataset</span>
                  </Link>

                  <Link
                    href="/dashboard/roles"
                    onClick={() => setShowUserDropdown(false)}
                    className="flex items-center gap-2 px-3.5 py-2 text-[#2c3338] hover:bg-[#2271b1] hover:text-white transition-colors"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Roles & Permissions</span>
                  </Link>
                </div>

                {/* Sign Out Button */}
                <div className="p-2 bg-[#f6f7f7] border-t border-[#c3c4c7]">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xs shadow-xs transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
