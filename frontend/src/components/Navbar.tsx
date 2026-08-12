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
  ArrowRight
} from 'lucide-react';
import { authApi, inventoryApi, ordersApi } from '@/lib/api';

const pageTitles: { [key: string]: { title: string; breadcrumb: string[] } } = {
  '/dashboard': { title: 'Dashboard', breadcrumb: ['Home', 'Dashboard'] },
  '/dashboard/inventory': { title: 'Inventory', breadcrumb: ['Home', 'Inventory'] },
  '/dashboard/orders': { title: 'Orders', breadcrumb: ['Home', 'Orders'] },
  '/dashboard/purchases': { title: 'Purchases', breadcrumb: ['Home', 'Purchases'] },
  '/dashboard/shipments': { title: 'Shipments', breadcrumb: ['Home', 'Shipments'] },
  '/dashboard/employees': { title: 'Employees', breadcrumb: ['Home', 'Employees'] },
  '/dashboard/accounts': { title: 'Accounts', breadcrumb: ['Home', 'Accounts'] },
  '/dashboard/roles': { title: 'Roles', breadcrumb: ['Home', 'Roles'] },
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
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const pathname = usePathname();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load User and real system notifications
  const loadNotifications = async () => {
    try {
      const meRes = await authApi.getMe().catch(() => ({ data: null }));
      setUserInfo(meRes?.data || null);

      const invRes = await inventoryApi.list().catch(() => ({ data: [] }));
      const ordRes = await ordersApi.list().catch(() => ({ data: [] }));

      const items: NotificationItem[] = [];

      // 1. Low stock alerts
      const lowStock = (invRes.data || []).filter((item: any) => (item.stock_quantity || 0) <= 5);
      lowStock.forEach((item: any) => {
        items.push({
          id: `inv-${item.id}`,
          title: 'Low Stock Alert',
          message: `${item.product_name} is low in stock (${item.stock_quantity} units remaining)`,
          time: 'Just now',
          type: 'alert',
          read: false,
          link: '/dashboard/inventory',
        });
      });

      // 2. Pending Order Reviews
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

      // 3. Ready to Ship orders
      const readyOrders = (ordRes.data || []).filter((o: any) => o.status === 'Ready to Ship');
      readyOrders.forEach((ord: any) => {
        items.push({
          id: `ord-ship-${ord.id}`,
          title: 'Ready for Dispatch',
          message: `Order ${ord.order_number} is ready for carrier dispatch`,
          time: ord.order_date || 'Today',
          type: 'shipment',
          read: false,
          link: '/dashboard/shipments',
        });
      });

      // 4. Fallback system welcome notification if clean
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

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markSingleAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const pageInfo = pageTitles[pathname] ||
    (pathname.startsWith('/dashboard/employees/') ? { title: 'User Profile', breadcrumb: ['Home', 'Employees', 'User Profile'] } :
      { title: 'Page', breadcrumb: ['Home'] });

  return (
    <header className="h-[56px] bg-white border-b border-surface-200/80 px-6 flex items-center justify-between sticky top-0 z-40 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      {/* Left: Breadcrumb */}
      <div className="flex items-center gap-2">
        <nav className="flex items-center gap-1.5">
          {pageInfo.breadcrumb.map((crumb, i) => (
            <React.Fragment key={i}>
              {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-300" />}
              <span className={i === pageInfo.breadcrumb.length - 1
                ? 'font-semibold text-slate-900 text-[14px]'
                : 'text-slate-500 font-medium text-[13px]'
              }>
                {crumb}
              </span>
            </React.Fragment>
          ))}
        </nav>
      </div>

      {/* Right: Notifications & User Profile */}
      <div className="flex items-center gap-2 relative" ref={dropdownRef}>
        {/* Notification Bell Button */}
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className={`relative p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50/80 transition-all ${showNotifications ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-200' : ''
            }`}
          title="Notifications"
        >
          <Bell className="w-[18px] h-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600 ring-2 ring-white" />
            </span>
          )}
        </button>

        {/* Notifications Dropdown Panel */}
        {showNotifications && (
          <div className="absolute top-12 right-0 w-[360px] bg-white border border-surface-200 rounded-xl shadow-elevated z-50 overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="px-4 py-2.5 bg-slate-50/80 border-b border-surface-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-blue-600" />
                <h3 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                    {unreadCount}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Mark all read</span>
                  </button>
                )}
                <button
                  onClick={() => setShowNotifications(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Notification List */}
            <div className="max-h-72 overflow-y-auto divide-y divide-surface-100">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-[13px] text-slate-400">
                  <Bell className="w-7 h-7 text-slate-200 mx-auto mb-2" />
                  No new notifications
                </div>
              ) : (
                notifications.map((n) => {
                  let Icon = Info;
                  let iconBg = 'bg-blue-50 text-blue-600';
                  if (n.type === 'alert') {
                    Icon = AlertTriangle;
                    iconBg = 'bg-amber-50 text-amber-600';
                  } else if (n.type === 'order') {
                    Icon = ShoppingCart;
                    iconBg = 'bg-blue-50 text-blue-600';
                  } else if (n.type === 'shipment') {
                    Icon = Truck;
                    iconBg = 'bg-indigo-50 text-indigo-600';
                  }

                  return (
                    <div
                      key={n.id}
                      onClick={() => markSingleAsRead(n.id)}
                      className={`px-4 py-3 transition-colors flex items-start gap-3 relative cursor-pointer ${!n.read ? 'bg-blue-50/30 hover:bg-blue-50/50' : 'hover:bg-slate-50'
                        }`}
                    >
                      <div className={`w-7 h-7 rounded-md ${iconBg} flex items-center justify-center shrink-0 mt-0.5`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <h4 className="text-[12px] font-semibold text-slate-800 truncate">{n.title}</h4>
                          <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">{n.time}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-snug line-clamp-2">{n.message}</p>

                        <Link
                          href={n.link}
                          onClick={() => setShowNotifications(false)}
                          className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                        >
                          <span>View Details</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>

                      {!n.read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 mt-2" />
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 bg-slate-50/80 border-t border-surface-200 text-center">
              <Link
                href="/dashboard/orders"
                onClick={() => setShowNotifications(false)}
                className="text-[11px] font-semibold text-slate-500 hover:text-blue-600 transition-colors"
              >
                View Orders & Activity Center →
              </Link>
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="h-5 w-px bg-surface-200/80 mx-1" />

        {/* User Info */}
        {userInfo && (
          <Link href="/dashboard/profile" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity cursor-pointer">
            <div className="text-right hidden sm:block">
              <div className="text-[13px] font-semibold text-slate-800">{userInfo.full_name}</div>
              <div className="text-[11px] text-blue-600 flex items-center justify-end gap-1 font-medium">
                <Shield className="w-3 h-3" />
                {userInfo.is_admin ? 'Super Admin' : userInfo.account_name ? `Partner · ${userInfo.account_name}` : userInfo.role_name || 'Employee'}
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-semibold text-[12px] shadow-sm">
              {(userInfo.full_name || 'U').charAt(0).toUpperCase()}
            </div>
          </Link>
        )}
      </div>
    </header>
  );
}
