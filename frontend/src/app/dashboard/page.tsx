'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { hasPermission } from '@/lib/permissions';
import {
  ShoppingCart,
  Package,
  ShoppingBag,
  Truck,
  Users,
  Building2,
  AlertTriangle,
  ArrowUpRight,
  Sparkles,
  X,
  CheckCircle2,
  Clock,
  DollarSign,
  Layers,
  MapPin,
  PackageCheck,
  ShieldCheck,
  ChevronDown,
  Store,
  Calendar,
  Filter,
  CheckSquare,
  Plus
} from 'lucide-react';
import { ordersApi, inventoryApi, purchasesApi, shipmentsApi, usersApi, accountsApi, authApi, tasksApi } from '@/lib/api';

export default function DashboardOverview() {
  const router = useRouter();
  // Active Dashboard Selector: 'superadmin' | 'purchase' | 'shipment'
  const [currentDashboard, setCurrentDashboard] = useState<'superadmin' | 'purchase' | 'shipment'>('superadmin');

  // Independent Time Range Filters for each card / section (Default: 'today')
  const [ordersTimeRange, setOrdersTimeRange] = useState<'today' | 'week' | 'month' | 'year' | 'all'>('today');
  const [purchasesTimeRange, setPurchasesTimeRange] = useState<'today' | 'week' | 'month' | 'year' | 'all'>('today');
  const [shipmentsTimeRange, setShipmentsTimeRange] = useState<'today' | 'week' | 'month' | 'year' | 'all'>('today');

  const [ordersList, setOrdersList] = useState<any[]>([]);
  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const [purchasesList, setPurchasesList] = useState<any[]>([]);
  const [shipmentsList, setShipmentsList] = useState<any[]>([]);
  const [accountsList, setAccountsList] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [tasksList, setTasksList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const ordersRes = await ordersApi.list().catch(() => ({ data: [] }));
      const invRes = await inventoryApi.list().catch(() => ({ data: [] }));
      const purRes = await purchasesApi.list().catch(() => ({ data: [] }));
      const shipRes = await shipmentsApi.list().catch(() => ({ data: [] }));
      const usersRes = await usersApi.list().catch(() => ({ data: [] }));
      const accRes = await accountsApi.list().catch(() => ({ data: [] }));
      const meRes = await authApi.getMe().catch(() => ({ data: null }));
      const tasksRes = await tasksApi.list().catch(() => ({ data: [] }));

      const allOrders = ordersRes.data || [];
      const allInv = invRes.data || [];
      const allPur = purRes.data || [];
      const allShip = shipRes.data || [];
      const allUsers = usersRes.data || [];
      const allAcc = accRes.data || [];
      const me = meRes?.data || null;
      const allTasks = tasksRes.data || [];

      setCurrentUser(me);

      // Filter by partner account if user is not superadmin and has an assigned account
      const filteredOrders = me && !me.is_admin && me.account_name
        ? allOrders.filter((o: any) => o.account_name === me.account_name)
        : allOrders;

      const filteredPurchases = me && !me.is_admin && me.account_name
        ? allPur.filter((p: any) => p.account_name === me.account_name)
        : allPur;

      setOrdersList(filteredOrders);
      setInventoryList(allInv);
      setPurchasesList(filteredPurchases);
      setShipmentsList(allShip);
      setUsersList(allUsers);
      setAccountsList(allAcc);
      setTasksList(allTasks);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  // Helper to filter array items by date range
  const filterByDateRange = (items: any[], range: string) => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return items.filter((item) => {
      const rawDate = item.order_date || item.created_at;
      if (!rawDate) return range === 'all';

      const d = new Date(rawDate);
      const itemDateStr = d.toISOString().split('T')[0];

      if (range === 'today') {
        return itemDateStr === todayStr;
      }
      if (range === 'week') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);
        return d >= sevenDaysAgo;
      }
      if (range === 'month') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);
        return d >= thirtyDaysAgo;
      }
      if (range === 'year') {
        return d.getFullYear() === now.getFullYear();
      }
      return true; // 'all'
    });
  };

  // Filtered Lists per Section
  const displayOrders = filterByDateRange(ordersList, ordersTimeRange);
  const displayPurchases = filterByDateRange(purchasesList, purchasesTimeRange);
  const displayShipments = filterByDateRange(shipmentsList, shipmentsTimeRange);
  const lowStockCount = inventoryList.filter((i: any) => i.stock_quantity <= 2).length;

  const pendingReviewOrdersList = displayOrders.filter(
    (o) => o.status === 'Pending Review' || o.status === 'Pending Procurement' || o.status === 'Backordered'
  );

  const readyForShipmentOrdersList = displayOrders.filter(
    (o) => o.status === 'Ready to Ship'
  );

  // Group Orders by Account / Channel for the modal
  const getOrdersByAccount = () => {
    const map: { [key: string]: { count: number; totalRevenue: number; orders: any[] } } = {};

    displayOrders.forEach((ord) => {
      const accName = ord.account_name || 'Direct Admin Sales';
      if (!map[accName]) {
        map[accName] = { count: 0, totalRevenue: 0, orders: [] };
      }
      map[accName].count += 1;
      map[accName].totalRevenue += (ord.product_price || 0) * (ord.qty || 1);
      map[accName].orders.push(ord);
    });

    return map;
  };

  // Pending Purchases Breakdown for the modal
  const getPendingPurchasesBreakdown = () => {
    const pendingReviewOrders = displayOrders.filter(
      (o) => o.status === 'Pending Review' || o.status === 'Pending Procurement' || o.status === 'Backordered'
    );

    return {
      pendingReviewOrders,
      activePurchaseOrders: displayPurchases,
    };
  };

  const roleName = currentUser?.role_name || (currentUser?.is_admin ? 'Super Admin' : '');

  const allCards = [
    {
      id: 'orders',
      title: ordersTimeRange === 'today' ? "Today's Orders" : `${ordersTimeRange.toUpperCase()} Orders`,
      value: displayOrders.length,
      subtitle: 'View Orders',
      icon: ShoppingCart,
      color: 'from-blue-600 to-blue-700',
      timeRange: ordersTimeRange,
      setTimeRange: setOrdersTimeRange,
    },
    {
      id: 'purchases',
      title: purchasesTimeRange === 'today' ? "Today's Purchases" : `${purchasesTimeRange.toUpperCase()} Purchases`,
      value: displayPurchases.length + pendingReviewOrdersList.length,
      subtitle: 'View Purchases',
      icon: ShoppingBag,
      color: 'from-blue-700 to-indigo-700',
      timeRange: purchasesTimeRange,
      setTimeRange: setPurchasesTimeRange,
    },
    {
      id: 'inventory',
      title: 'Inventory Stock',
      value: inventoryList.length,
      subtitle: lowStockCount > 0 ? `${lowStockCount} low stock alerts` : 'Stock updated',
      icon: Package,
      color: 'from-sky-600 to-blue-600',
    },
    {
      id: 'shipments',
      title: 'Shipments Tracked',
      value: displayShipments.length,
      subtitle: 'View Shipments',
      icon: Truck,
      color: 'from-blue-800 to-slate-800',
      timeRange: shipmentsTimeRange,
      setTimeRange: setShipmentsTimeRange,
    },
    {
      id: 'employees',
      title: 'Team Employees',
      value: usersList.length,
      subtitle: 'View Team',
      icon: Users,
      color: 'from-blue-500 to-indigo-600',
    },
    {
      id: 'accounts',
      title: 'Registered Accounts',
      value: accountsList.length,
      subtitle: 'View Accounts',
      icon: Building2,
      color: 'from-indigo-600 to-blue-700',
    },
  ];

  const assignedPartnersCount = usersList.filter((u: any) => u.is_partner && u.assigned_employee_id === currentUser?.id).length;

  const isPartner = currentUser?.is_partner || currentUser?.role_name === 'Channel Partner';

  let visibleCards = allCards.filter((card) => {
    if (isPartner) {
      return ['orders', 'inventory', 'shipments'].includes(card.id);
    }
    if (card.id === 'inventory') return hasPermission(currentUser, 'inventory:read');
    if (card.id === 'orders') return hasPermission(currentUser, 'orders:read');
    if (card.id === 'purchases') return hasPermission(currentUser, 'purchases:read');
    if (card.id === 'shipments') return hasPermission(currentUser, 'shipments:read');
    return false;
  });

  if (visibleCards.length === 0 && currentUser && !isPartner) {
    visibleCards = [
      {
        id: 'assigned_partners',
        title: 'Assigned Onboarding Partners',
        value: assignedPartnersCount,
        subtitle: 'View Partners',
        icon: Store,
        color: 'from-blue-600 to-indigo-600',
      },
      {
        id: 'active_tasks',
        title: 'Active Tasks',
        value: tasksList.filter((t: any) => t.status !== 'Completed').length,
        subtitle: 'View Active Tasks',
        icon: CheckSquare,
        color: 'from-indigo-600 to-purple-600',
      },
      {
        id: 'completed_tasks',
        title: 'Completed Tasks',
        value: tasksList.filter((t: any) => t.status === 'Completed').length,
        subtitle: 'View History',
        icon: ShieldCheck,
        color: 'from-emerald-600 to-teal-600',
      },
    ];
  }

  return (
    <div className="space-y-6">

      {/* Low Stock Warning Banner - Shown to Admin and Inventory Manager (Not Partners) */}
      {!isPartner && lowStockCount > 0 && hasPermission(currentUser, 'inventory:read') && (
        <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/60 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-3 text-amber-800 text-sm font-medium">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <span>Notice: <strong className="text-amber-900">{lowStockCount}</strong> product(s) in inventory are low or out of stock.</span>
          </div>
          <a
            href="/dashboard/inventory"
            className="text-xs font-semibold px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-all"
          >
            View Details →
          </a>
        </div>
      )}

      {/* Grid Metrics Cards - 4-Column B2B Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {visibleCards.map((card, index) => {
          const Icon = card.icon;

          const handleCardClick = () => {
            const routeMap: { [key: string]: string } = {
              orders: '/dashboard/orders',
              purchases: '/dashboard/purchases',
              inventory: '/dashboard/inventory',
              shipments: '/dashboard/shipments',
              employees: '/dashboard/employees',
              accounts: '/dashboard/accounts',
              assigned_partners: '/dashboard/partners',
              active_tasks: '/dashboard/tasks',
              completed_tasks: '/dashboard/tasks',
            };
            const target = routeMap[card.id];
            if (target) {
              router.push(target);
            }
          };

          return (
            <div
              key={card.id}
              onClick={handleCardClick}
              className="group text-left relative bg-white border border-slate-200/90 rounded-xl p-4.5 flex flex-col justify-between cursor-pointer transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md hover:border-blue-300 select-none"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center text-white shadow-xs`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <p className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">{card.title}</p>
                </div>

                {/* Per-Card Time Filter Selector */}
                {card.setTimeRange && (
                  <select
                    value={card.timeRange}
                    onChange={(e: any) => card.setTimeRange(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="text-[11px] font-semibold bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-md px-2 py-0.5 outline-none cursor-pointer transition-colors"
                  >
                    <option value="today">Today</option>
                    <option value="week">Week</option>
                    <option value="month">Month</option>
                    <option value="year">Year</option>
                    <option value="all">All</option>
                  </select>
                )}
              </div>

              <div className="my-0.5">
                <h3 className="text-[28px] font-bold text-slate-900 tracking-tight leading-none">{loading ? '...' : card.value}</h3>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[12px] text-blue-600 font-semibold group-hover:text-blue-700 transition-colors">
                <span>{card.subtitle}</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-blue-600 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Assigned Partner Onboarding Tasks Widget (Only visible if assigned partners exist) */}
      {(() => {
        if (currentUser?.is_partner) return null;

        const assignedPartners = usersList.filter((u: any) => {
          if (!u.is_partner) return false;
          return u.assigned_employee_id === currentUser?.id;
        });

        if (assignedPartners.length === 0) return null;

        return (
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-[13px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Store className="w-4 h-4 text-blue-600" />
                  Assigned Channel Partner Onboarding Workflows ({assignedPartners.length})
                </h3>
                <p className="text-[12px] text-slate-500 font-medium mt-0.5">
                  High Priority onboarding tasks assigned to you. Click to upload documents and complete onboarding.
                </p>
              </div>

              <Link
                href="/dashboard/partners"
                className="text-[12px] font-bold text-blue-600 hover:underline flex items-center gap-1"
              >
                <span>View All Partners</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {assignedPartners.map((partner: any) => (
                <div key={partner.id} className="p-3.5 rounded-lg bg-blue-50/40 border border-blue-200/60 flex flex-col justify-between gap-3 hover:border-blue-400 transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[13px] font-bold text-slate-900">{partner.full_name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{partner.email}</div>
                    </div>

                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                      {partner.account_name || 'Marketplace'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-blue-200/40">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-semibold">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      <span>Stage: <strong className="text-blue-900">{partner.onboarding_status || 'Draft'}</strong></span>
                    </div>

                    <Link
                      href={`/dashboard/partners/${partner.id}`}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[11px] font-semibold transition-all flex items-center gap-1"
                    >
                      <span>Complete Onboarding</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* MY ASSIGNED TASK TICKETS LIST (Only if tasks exist) */}
      {!isPartner && tasksList.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-[13px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-blue-600" />
                My Assigned Task Tickets ({tasksList.length})
              </h3>
              <p className="text-[12px] text-slate-500 font-medium mt-0.5">
                Live tasks and onboarding tickets assigned to you by administrators.
              </p>
            </div>

            <Link
              href="/dashboard/tasks"
              className="text-[12px] font-semibold text-blue-600 hover:underline flex items-center gap-1"
            >
              <span>Open Tasks Portal</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-[12px]">
              <thead>
                <tr className="bg-slate-50/80 text-slate-600 font-bold uppercase border-b border-slate-200 text-[11px]">
                  <th className="py-2.5 px-3">Ticket ID</th>
                  <th className="py-2.5 px-3">Task Title</th>
                  <th className="py-2.5 px-3">Priority</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {tasksList.map((task: any) => (
                  <tr key={task.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-600">{task.ticket_code}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{task.title}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${task.priority === 'High' || task.priority === 'Urgent'
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                        {task.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <Link
                        href="/dashboard/tasks"
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md text-[11px] inline-flex items-center gap-1"
                      >
                        <span>View Ticket</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. SUPERADMIN DASHBOARD ALL-IN-ONE PANELS */}
      {/* ========================================================================= */}
      {(currentUser?.is_admin || roleName === 'Super Admin') && (
        <div className="space-y-8">
          {/* SECTION A: ORDERS OVERVIEW TABLE */}
          <div className="card-premium p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-blue-600" />
                  Sales Orders & Account Activity ({displayOrders.length})
                </h2>
                <p className="text-sm text-slate-600 font-medium">Live customer order list</p>
              </div>

              <div className="flex items-center gap-3">
                {/* Orders Time Range Selector */}
                <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                  <Filter className="w-4 h-4 text-slate-600 ml-1.5" />
                  <select
                    value={ordersTimeRange}
                    onChange={(e: any) => setOrdersTimeRange(e.target.value)}
                    className="text-xs font-bold bg-transparent text-slate-800 outline-none pr-2 cursor-pointer"
                  >
                    <option value="today">Today</option>
                    <option value="week">Last Week</option>
                    <option value="month">Last Month</option>
                    <option value="year">This Year</option>
                    <option value="all">All Time</option>
                  </select>
                </div>

                <a
                  href="/dashboard/orders"
                  className="btn-primary"
                >
                  Manage Orders
                </a>
              </div>
            </div>

            {displayOrders.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm italic">
                No orders found for <strong className="uppercase">{ordersTimeRange}</strong>. Change filter above.
              </div>
            ) : (
              <div className="table-container border border-slate-200 rounded-xl">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Order #</th>
                      <th className="py-3 px-4">Buyer Name</th>
                      <th className="py-3 px-4">Product</th>
                      <th className="py-3 px-4">Qty</th>
                      <th className="py-3 px-4">Total Amount</th>
                      <th className="py-3 px-4">Account Source</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {displayOrders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-medium text-blue-600">{ord.order_number}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900">{ord.buyer_name}</td>
                        <td className="py-3.5 px-4 text-slate-700">{ord.product_name}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900">{ord.qty}</td>
                        <td className="py-3.5 px-4 font-bold text-emerald-700">₹{((ord.product_price || 0) * (ord.qty || 1)).toFixed(2)}</td>
                        <td className="py-3.5 px-4 text-xs font-semibold text-slate-600">{ord.account_name || 'Direct Sales'}</td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 ${ord.status === 'Ready for Shipment'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : ord.status === 'Pending Review' || ord.status === 'Pending Procurement'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}>
                            {ord.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SECTION B: PENDING PURCHASES & PRODUCT REQUIREMENTS */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-amber-600" />
                  Pending Purchases & Product Procurement ({pendingReviewOrdersList.length})
                </h2>
                <p className="text-sm text-slate-600 font-medium">Orders requiring supplier purchase, quantities, and costs</p>
              </div>

              <div className="flex items-center gap-3">
                {/* Purchases Time Range Selector */}
                <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                  <Filter className="w-4 h-4 text-slate-600 ml-1.5" />
                  <select
                    value={purchasesTimeRange}
                    onChange={(e: any) => setPurchasesTimeRange(e.target.value)}
                    className="text-xs font-bold bg-transparent text-slate-800 outline-none pr-2 cursor-pointer"
                  >
                    <option value="today">Today</option>
                    <option value="week">Last Week</option>
                    <option value="month">Last Month</option>
                    <option value="year">This Year</option>
                    <option value="all">All Time</option>
                  </select>
                </div>

                <a
                  href="/dashboard/purchases"
                  className="btn-primary"
                >
                  Manage Purchases
                </a>
              </div>
            </div>

            {pendingReviewOrdersList.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs italic bg-slate-50 rounded-xl border border-slate-200">
                No orders waiting for purchase for <strong className="uppercase">{purchasesTimeRange}</strong>
              </div>
            ) : (
              <div className="table-container border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-amber-50/70 text-amber-900 border-b border-amber-200 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-3">Order #</th>
                      <th className="py-3 px-3">Product Required</th>
                      <th className="py-3 px-3">Required Qty</th>
                      <th className="py-3 px-3">Unit Price (₹)</th>
                      <th className="py-3 px-3">Total Purchase Cost</th>
                      <th className="py-3 px-3">Source Account</th>
                      <th className="py-3 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {pendingReviewOrdersList.map((ord: any) => (
                      <tr key={ord.id} className="hover:bg-amber-50/30">
                        <td className="py-2.5 px-3 font-mono font-semibold text-blue-600">{ord.order_number}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{ord.product_name}</td>
                        <td className="py-2.5 px-3 font-bold text-amber-700">{ord.qty} units</td>
                        <td className="py-2.5 px-3 text-slate-700">₹{(ord.product_price || 0).toFixed(2)}</td>
                        <td className="py-2.5 px-3 font-bold text-emerald-700">₹{((ord.product_price || 0) * (ord.qty || 1)).toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-slate-600">{ord.account_name || 'Direct Sales'}</td>
                        <td className="py-2.5 px-3 font-semibold text-amber-700">{ord.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SECTION C: INVENTORY PRODUCTS & SHIPMENTS (2-COLUMN GRID) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Inventory Stock Panel */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-emerald-600" />
                  Inventory Product Stock List
                </h2>
                <a href="/dashboard/inventory" className="text-xs font-semibold text-emerald-600 hover:underline">
                  Manage Stock &rarr;
                </a>
              </div>

              <div className="table-container border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase">
                      <th className="py-2.5 px-3">Product Name</th>
                      <th className="py-2.5 px-3">Stock Qty</th>
                      <th className="py-2.5 px-3">Price</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {inventoryList.map((item: any) => {
                      const isLow = item.stock_quantity <= 2;
                      return (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-semibold text-slate-900">{item.product_name}</td>
                          <td className="py-2 px-3 font-bold text-slate-800">{item.stock_quantity} units</td>
                          <td className="py-2 px-3 font-semibold text-emerald-700">₹{item.price.toFixed(2)}</td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap shrink-0 ${isLow ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}>
                              {isLow ? 'Low Stock' : 'Stock OK'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Shipments Logistics Panel */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-purple-600" />
                  Shipment Dispatches ({displayShipments.length})
                </h2>

                <div className="flex items-center gap-2">
                  <select
                    value={shipmentsTimeRange}
                    onChange={(e: any) => setShipmentsTimeRange(e.target.value)}
                    className="text-xs font-semibold bg-slate-100 text-slate-800 rounded px-2 py-1 outline-none border border-slate-200 cursor-pointer"
                  >
                    <option value="today">Today</option>
                    <option value="week">Last Week</option>
                    <option value="month">Last Month</option>
                    <option value="year">This Year</option>
                    <option value="all">All Time</option>
                  </select>

                  <a href="/dashboard/shipments" className="text-xs font-semibold text-purple-600 hover:underline">
                    Manage &rarr;
                  </a>
                </div>
              </div>

              {displayShipments.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs italic bg-slate-50 rounded-xl border border-slate-200">
                  No shipment dispatches created for <strong className="uppercase">{shipmentsTimeRange}</strong>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase">
                        <th className="py-2.5 px-3">Carrier Partner</th>
                        <th className="py-2.5 px-3">Tracking ID</th>
                        <th className="py-2.5 px-3">Product Name</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {displayShipments.map((ship: any) => (
                        <tr key={ship.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-semibold text-slate-900">{ship.shipment_partner}</td>
                          <td className="py-2 px-3 font-mono text-purple-700 font-semibold">{ship.tracking_id}</td>
                          <td className="py-2 px-3 text-slate-700">{ship.product_name}</td>
                          <td className="py-2 px-3 font-bold text-purple-700">{ship.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. PURCHASE DEPARTMENT DASHBOARD VIEW */}
      {/* ========================================================================= */}
      {(currentUser?.is_admin || roleName === 'Purchase Manager' || currentDashboard === 'purchase') && !['Inventory Manager', 'Shipment Manager'].includes(roleName) && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
              <div className="text-sm font-bold uppercase text-slate-600 tracking-wider">Orders Needing Purchase ({purchasesTimeRange.toUpperCase()})</div>
              <div className="text-4xl font-extrabold text-amber-600 mt-2">{pendingReviewOrdersList.length}</div>
            </div>
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
              <div className="text-sm font-bold uppercase text-slate-600 tracking-wider">Supplier Purchases ({purchasesTimeRange.toUpperCase()})</div>
              <div className="text-4xl font-extrabold text-slate-900 mt-2">{displayPurchases.length}</div>
            </div>
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
              <div className="text-sm font-bold uppercase text-slate-600 tracking-wider">Low Stock Products</div>
              <div className="text-4xl font-extrabold text-red-600 mt-2">{lowStockCount}</div>
            </div>
          </div>

          {/* Pending Purchases Detail Table */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-amber-600" />
                  Product Quantity & Purchase Cost Requirements
                </h2>
                <p className="text-sm text-slate-500 font-medium">Products, quantities, unit prices, and supplier cost</p>
              </div>
              <a
                href="/dashboard/purchases"
                className="btn-primary"
              >
                Go to Purchases Dept
              </a>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-amber-50/70 text-amber-900 border-b border-amber-200 font-bold uppercase tracking-wider">
                    <th className="py-3 px-3">Order #</th>
                    <th className="py-3 px-3">Product Name</th>
                    <th className="py-3 px-3">Qty Required</th>
                    <th className="py-3 px-3">Unit Price (₹)</th>
                    <th className="py-3 px-3">Total Purchase Cost</th>
                    <th className="py-3 px-3">Account Source</th>
                    <th className="py-3 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {pendingReviewOrdersList.map((ord: any) => (
                    <tr key={ord.id} className="hover:bg-amber-50/30">
                      <td className="py-3 px-3 font-mono font-semibold text-blue-600">{ord.order_number}</td>
                      <td className="py-3 px-3 font-semibold text-slate-900">{ord.product_name}</td>
                      <td className="py-3 px-3 font-bold text-amber-700">{ord.qty} units</td>
                      <td className="py-3 px-3 text-slate-700">₹{(ord.product_price || 0).toFixed(2)}</td>
                      <td className="py-3 px-3 font-bold text-emerald-700">₹{((ord.product_price || 0) * (ord.qty || 1)).toFixed(2)}</td>
                      <td className="py-3 px-3 text-slate-600">{ord.account_name || 'Direct Sales'}</td>
                      <td className="py-3 px-3 font-semibold text-amber-700">{ord.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SHIPMENT DEPARTMENT DASHBOARD VIEW */}
      {/* ========================================================================= */}
      {(currentUser?.is_admin || roleName === 'Shipment Manager' || currentDashboard === 'shipment') && !['Inventory Manager', 'Purchase Manager'].includes(roleName) && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
              <div className="text-sm font-bold uppercase text-slate-600 tracking-wider">Orders Ready for Dispatch ({ordersTimeRange.toUpperCase()})</div>
              <div className="text-4xl font-extrabold text-purple-600 mt-2">{readyForShipmentOrdersList.length}</div>
            </div>
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
              <div className="text-sm font-bold uppercase text-slate-600 tracking-wider">In-Transit Dispatches ({shipmentsTimeRange.toUpperCase()})</div>
              <div className="text-4xl font-extrabold text-blue-600 mt-2">{displayShipments.filter((s: any) => s.status !== 'Delivered').length}</div>
            </div>
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
              <div className="text-sm font-bold uppercase text-slate-600 tracking-wider">Total Delivered Shipments</div>
              <div className="text-4xl font-extrabold text-emerald-600 mt-2">{displayShipments.filter((s: any) => s.status === 'Delivered').length}</div>
            </div>
          </div>

          {/* Orders Ready for Dispatch Table */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-purple-600" />
                  Orders Approved & Ready for Dispatch
                </h2>
                <p className="text-xs text-slate-500">Orders cleared by Purchase Department waiting for shipping carrier</p>
              </div>
              <a
                href="/dashboard/shipments"
                className="text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors shadow-xs"
              >
                Go to Shipments Dept &rarr;
              </a>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-purple-50/70 text-purple-900 border-b border-purple-200 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-3">Order #</th>
                    <th className="py-3 px-3">Buyer Name</th>
                    <th className="py-3 px-3">Shipping Address</th>
                    <th className="py-3 px-3">Product</th>
                    <th className="py-3 px-3">Qty</th>
                    <th className="py-3 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {readyForShipmentOrdersList.map((ord: any) => (
                    <tr key={ord.id} className="hover:bg-purple-50/30">
                      <td className="py-2.5 px-3 font-mono font-semibold text-blue-600">{ord.order_number}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{ord.buyer_name}</td>
                      <td className="py-2.5 px-3 text-slate-700">{ord.shipment_address_1}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">{ord.product_name}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{ord.qty}</td>
                      <td className="py-2.5 px-3 font-semibold text-emerald-700">{ord.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* 4. INVENTORY MANAGER DASHBOARD VIEW */}
      {/* ========================================================================= */}
      {roleName === 'Inventory Manager' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-emerald-600" />
                  Inventory Product Stock List ({inventoryList.length})
                </h2>
                <p className="text-xs text-slate-500">Live catalog, quantities, and stock alerts</p>
              </div>
              <a href="/dashboard/inventory" className="btn-primary">
                Manage Inventory
              </a>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase">
                    <th className="py-2.5 px-3">Product Name</th>
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3">Stock Qty</th>
                    <th className="py-2.5 px-3">Price</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {inventoryList.map((item: any) => {
                    const isLow = item.stock_quantity <= 5;
                    const isOut = item.stock_quantity === 0;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{item.product_name}</td>
                        <td className="py-2.5 px-3 font-mono text-blue-600">{item.sku || '—'}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-800">{item.stock_quantity} units</td>
                        <td className="py-2.5 px-3 font-semibold text-emerald-700">${item.price.toFixed(2)}</td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap shrink-0 ${isOut ? 'bg-red-50 text-red-700 border border-red-200' : isLow ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                            {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'Stock OK'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. TOTAL ORDERS MODAL (WITH TIME FILTER & ACCOUNT BREAKDOWN) */}
      {/* ========================================================================= */}
      {activeModal === 'orders' && (
        <div
          onClick={() => setActiveModal(null)}
          className="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="modal-content bg-white border border-surface-200 w-full max-w-4xl rounded-2xl p-6 shadow-modal space-y-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <ShoppingCart className="w-6 h-6 text-blue-600" />
                  Orders Breakdown by Account ({ordersTimeRange.toUpperCase()})
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Order counts and sales values filtered for selected time period</p>
              </div>

              {/* Modal Time Filters */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => setOrdersTimeRange('today')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${ordersTimeRange === 'today' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
                >
                  Today
                </button>
                <button
                  onClick={() => setOrdersTimeRange('week')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${ordersTimeRange === 'week' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
                >
                  Week
                </button>
                <button
                  onClick={() => setOrdersTimeRange('month')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${ordersTimeRange === 'month' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
                >
                  Month
                </button>
                <button
                  onClick={() => setOrdersTimeRange('year')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${ordersTimeRange === 'year' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
                >
                  Year
                </button>
                <button
                  onClick={() => setOrdersTimeRange('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${ordersTimeRange === 'all' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
                >
                  All
                </button>
                <button
                  onClick={() => setActiveModal(null)}
                  className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 ml-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Account Breakdown Summary Cards */}
            <div className="space-y-4">
              {Object.keys(getOrdersByAccount()).length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs italic">
                  No orders found for <strong className="uppercase">{ordersTimeRange}</strong>.
                </div>
              ) : (
                Object.entries(getOrdersByAccount()).map(([accName, data]) => (
                  <div key={accName} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-blue-600" />
                        <h3 className="font-bold text-slate-900 text-sm">{accName}</h3>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-semibold">
                        <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-200">
                          {data.count} Order(s)
                        </span>
                        <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-200">
                          ₹{data.totalRevenue.toFixed(2)} Total Value
                        </span>
                      </div>
                    </div>

                    {/* Orders Table for this Account */}
                    <div className="overflow-x-auto bg-white rounded-lg border border-slate-200">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-100/60 text-slate-600 border-b border-slate-200 font-semibold">
                            <th className="py-2.5 px-3">Order #</th>
                            <th className="py-2.5 px-3">Buyer Name</th>
                            <th className="py-2.5 px-3">Product Name</th>
                            <th className="py-2.5 px-3">Qty</th>
                            <th className="py-2.5 px-3">Price</th>
                            <th className="py-2.5 px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-800">
                          {data.orders.map((ord: any) => (
                            <tr key={ord.id} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-mono font-medium text-blue-600">{ord.order_number}</td>
                              <td className="py-2 px-3 font-semibold text-slate-900">{ord.buyer_name}</td>
                              <td className="py-2 px-3 text-slate-700">{ord.product_name}</td>
                              <td className="py-2 px-3 font-bold">{ord.qty}</td>
                              <td className="py-2 px-3 font-semibold text-emerald-700">₹{((ord.product_price || 0) * ord.qty).toFixed(2)}</td>
                              <td className="py-2 px-3">
                                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                  {ord.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <Link
                href="/dashboard/orders"
                onClick={() => setActiveModal(null)}
                className="btn-primary text-xs"
              >
                <span>View Full Orders Page</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-lg shadow-xs"
              >
                Close Breakdown
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. PENDING PURCHASES MODAL (WITH TIME FILTER & PRODUCT REQUIREMENT) */}
      {/* ========================================================================= */}
      {activeModal === 'purchases' && (
        <div
          onClick={() => setActiveModal(null)}
          className="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="modal-content bg-white border border-surface-200 w-full max-w-4xl rounded-2xl p-6 shadow-modal space-y-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <ShoppingBag className="w-6 h-6 text-amber-600" />
                  Pending Purchases & Required Product Quantities ({purchasesTimeRange.toUpperCase()})
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Which products need to be ordered, required quantities, and total purchase costs</p>
              </div>

              {/* Modal Time Filters */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => setPurchasesTimeRange('today')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${purchasesTimeRange === 'today' ? 'bg-amber-600 text-white' : 'text-slate-600'}`}
                >
                  Today
                </button>
                <button
                  onClick={() => setPurchasesTimeRange('week')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${purchasesTimeRange === 'week' ? 'bg-amber-600 text-white' : 'text-slate-600'}`}
                >
                  Week
                </button>
                <button
                  onClick={() => setPurchasesTimeRange('month')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${purchasesTimeRange === 'month' ? 'bg-amber-600 text-white' : 'text-slate-600'}`}
                >
                  Month
                </button>
                <button
                  onClick={() => setPurchasesTimeRange('year')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${purchasesTimeRange === 'year' ? 'bg-amber-600 text-white' : 'text-slate-600'}`}
                >
                  Year
                </button>
                <button
                  onClick={() => setPurchasesTimeRange('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${purchasesTimeRange === 'all' ? 'bg-amber-600 text-white' : 'text-slate-600'}`}
                >
                  All
                </button>
                <button
                  onClick={() => setActiveModal(null)}
                  className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 ml-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Pending Orders Section */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Products Needing Procurement / Purchase ({getPendingPurchasesBreakdown().pendingReviewOrders.length})
              </h3>

              {getPendingPurchasesBreakdown().pendingReviewOrders.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs italic bg-slate-50 rounded-xl border border-slate-200">
                  No orders currently waiting for purchase for <strong className="uppercase">{purchasesTimeRange}</strong>
                </div>
              ) : (
                <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-amber-50/70 text-amber-900 border-b border-amber-200 font-semibold uppercase tracking-wider">
                        <th className="py-3 px-3">Order #</th>
                        <th className="py-3 px-3">Product Required</th>
                        <th className="py-3 px-3">Required Qty</th>
                        <th className="py-3 px-3">Unit Price (₹)</th>
                        <th className="py-3 px-3">Total Purchase Cost</th>
                        <th className="py-3 px-3">Source Account</th>
                        <th className="py-3 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {getPendingPurchasesBreakdown().pendingReviewOrders.map((ord: any) => {
                        const totalCost = (ord.product_price || 0) * (ord.qty || 1);
                        return (
                          <tr key={ord.id} className="hover:bg-amber-50/30 transition-colors">
                            <td className="py-2.5 px-3 font-mono font-semibold text-blue-600">{ord.order_number}</td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">{ord.product_name}</td>
                            <td className="py-2.5 px-3 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block my-1">
                              {ord.qty} units
                            </td>
                            <td className="py-2.5 px-3 text-slate-700">₹{(ord.product_price || 0).toFixed(2)}</td>
                            <td className="py-2.5 px-3 font-bold text-emerald-700">₹{totalCost.toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-slate-600">{ord.account_name || 'Direct Sales'}</td>
                            <td className="py-2.5 px-3 font-semibold text-amber-700">{ord.status}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Active Supplier Purchase Orders */}
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 pt-2">
                <PackageCheck className="w-4 h-4 text-emerald-600" />
                Active Procurement Supplier Purchases ({displayPurchases.length})
              </h3>

              {displayPurchases.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs italic bg-slate-50 rounded-xl border border-slate-200">
                  No active supplier purchase orders recorded for <strong className="uppercase">{purchasesTimeRange}</strong>
                </div>
              ) : (
                <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase">
                        <th className="py-3 px-3">Order ID</th>
                        <th className="py-3 px-3">Product Name</th>
                        <th className="py-3 px-3">Qty</th>
                        <th className="py-3 px-3">Purchase Value</th>
                        <th className="py-3 px-3">Est. Delivery Date</th>
                        <th className="py-3 px-3">Supplier Account</th>
                        <th className="py-3 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {displayPurchases.map((pur: any) => (
                        <tr key={pur.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono font-medium text-blue-600">#ORD-{pur.order_id}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">{pur.product_name}</td>
                          <td className="py-2.5 px-3 font-bold">{pur.qty}</td>
                          <td className="py-2.5 px-3 font-semibold text-emerald-700">₹{pur.purchase_value.toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-slate-600">{pur.estimated_shipment_date || 'TBD'}</td>
                          <td className="py-2.5 px-3 text-slate-500">{pur.account_name || 'N/A'}</td>
                          <td className="py-2.5 px-3 font-semibold text-emerald-700">{pur.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <Link
                href="/dashboard/purchases"
                onClick={() => setActiveModal(null)}
                className="btn-primary text-xs"
              >
                <span>View Full Purchases Page</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-lg shadow-xs"
              >
                Close Modal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. INVENTORY STOCK MODAL */}
      {/* ========================================================================= */}
      {activeModal === 'inventory' && (
        <div
          onClick={() => setActiveModal(null)}
          className="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="modal-content bg-white border border-surface-200 w-full max-w-3xl rounded-2xl p-6 shadow-modal space-y-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Package className="w-6 h-6 text-emerald-600" />
                  Inventory Stock & Products Breakdown
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Showing all registered products and live stock quantities</p>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-xs">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase">
                    <th className="py-3 px-3">Product Name</th>
                    <th className="py-3 px-3">Current Stock Qty</th>
                    <th className="py-3 px-3">Unit Price (₹)</th>
                    <th className="py-3 px-3">Stock Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {inventoryList.map((item: any) => {
                    const isLow = item.stock_quantity <= 2;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{item.product_name}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-800">{item.stock_quantity} units</td>
                        <td className="py-2.5 px-3 font-semibold text-emerald-700">₹{item.price.toFixed(2)}</td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap shrink-0 ${isLow
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}
                          >
                            {isLow ? 'Low Stock Warning' : 'Sufficient Stock'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Link
                href="/dashboard/inventory"
                onClick={() => setActiveModal(null)}
                className="btn-primary text-xs"
              >
                <span>View Full Inventory Page</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-lg shadow-xs"
              >
                Close Modal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. SHIPMENTS TRACKED MODAL (WITH TIME FILTER) */}
      {/* ========================================================================= */}
      {activeModal === 'shipments' && (
        <div
          onClick={() => setActiveModal(null)}
          className="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="modal-content bg-white border border-surface-200 w-full max-w-4xl rounded-2xl p-6 shadow-modal space-y-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Truck className="w-6 h-6 text-purple-600" />
                  Shipments Tracking Breakdown ({shipmentsTimeRange.toUpperCase()})
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Carrier partner status and tracking information</p>
              </div>

              {/* Modal Time Filters */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => setShipmentsTimeRange('today')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${shipmentsTimeRange === 'today' ? 'bg-purple-600 text-white' : 'text-slate-600'}`}
                >
                  Today
                </button>
                <button
                  onClick={() => setShipmentsTimeRange('week')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${shipmentsTimeRange === 'week' ? 'bg-purple-600 text-white' : 'text-slate-600'}`}
                >
                  Week
                </button>
                <button
                  onClick={() => setShipmentsTimeRange('month')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${shipmentsTimeRange === 'month' ? 'bg-purple-600 text-white' : 'text-slate-600'}`}
                >
                  Month
                </button>
                <button
                  onClick={() => setShipmentsTimeRange('year')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${shipmentsTimeRange === 'year' ? 'bg-purple-600 text-white' : 'text-slate-600'}`}
                >
                  Year
                </button>
                <button
                  onClick={() => setShipmentsTimeRange('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${shipmentsTimeRange === 'all' ? 'bg-purple-600 text-white' : 'text-slate-600'}`}
                >
                  All
                </button>
                <button
                  onClick={() => setActiveModal(null)}
                  className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 ml-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-xs">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase">
                    <th className="py-3 px-3">Order ID</th>
                    <th className="py-3 px-3">Carrier Partner</th>
                    <th className="py-3 px-3">Tracking ID</th>
                    <th className="py-3 px-3">Product Name</th>
                    <th className="py-3 px-3">Weight</th>
                    <th className="py-3 px-3">Cost</th>
                    <th className="py-3 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {displayShipments.map((ship: any) => (
                    <tr key={ship.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono font-medium text-blue-600">#ORD-{ship.order_id}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{ship.shipment_partner}</td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-purple-700">{ship.tracking_id}</td>
                      <td className="py-2.5 px-3 text-slate-700">{ship.product_name}</td>
                      <td className="py-2.5 px-3 text-slate-600">{ship.weight} kg</td>
                      <td className="py-2.5 px-3 font-semibold text-emerald-700">₹{ship.shipment_cost.toFixed(2)}</td>
                      <td className="py-2.5 px-3 font-bold text-purple-700">{ship.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Link
                href="/dashboard/shipments"
                onClick={() => setActiveModal(null)}
                className="btn-primary text-xs"
              >
                <span>View Full Shipments Page</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-lg shadow-xs"
              >
                Close Modal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. TEAM EMPLOYEES MODAL */}
      {/* ========================================================================= */}
      {activeModal === 'employees' && (
        <div
          onClick={() => setActiveModal(null)}
          className="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="modal-content bg-white border border-surface-200 w-full max-w-2xl rounded-2xl p-6 shadow-modal space-y-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-6 h-6 text-cyan-600" />
                  Team Employees Breakdown
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Active team members and assigned roles</p>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-xs">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase">
                    <th className="py-3 px-3">Name</th>
                    <th className="py-3 px-3">Email</th>
                    <th className="py-3 px-3">Role</th>
                    <th className="py-3 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {usersList.map((user: any) => (
                    <tr key={user.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{user.full_name}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{user.email}</td>
                      <td className="py-2.5 px-3 font-semibold text-indigo-700">
                        {user.is_admin ? 'Super Admin' : user.role_name || (typeof user.role === 'object' ? user.role?.name : user.role) || 'Staff'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Link
                href="/dashboard/employees"
                onClick={() => setActiveModal(null)}
                className="btn-primary text-xs"
              >
                <span>View Employees Page</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-lg shadow-xs"
              >
                Close Modal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. REGISTERED ACCOUNTS MODAL */}
      {/* ========================================================================= */}
      {activeModal === 'accounts' && (
        <div
          onClick={() => setActiveModal(null)}
          className="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="modal-content bg-white border border-surface-200 w-full max-w-2xl rounded-2xl p-6 shadow-modal space-y-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-6 h-6 text-rose-600" />
                  Registered Accounts & Marketplaces
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Channel partner accounts and store owners</p>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-xs">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase">
                    <th className="py-3 px-3">Account Name</th>
                    <th className="py-3 px-3">Account Type</th>
                    <th className="py-3 px-3">Owner / Contact</th>
                    <th className="py-3 px-3">Commission Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {accountsList.map((acc: any) => (
                    <tr key={acc.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{acc.account_name}</td>
                      <td className="py-2.5 px-3 font-medium text-indigo-700">{acc.account_type}</td>
                      <td className="py-2.5 px-3 text-slate-600">{acc.owner_name}</td>
                      <td className="py-2.5 px-3 font-bold text-emerald-700">{acc.commission_rate || 5}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Link
                href="/dashboard/accounts"
                onClick={() => setActiveModal(null)}
                className="btn-primary text-xs"
              >
                <span>View Accounts Page</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-lg shadow-xs"
              >
                Close Modal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
