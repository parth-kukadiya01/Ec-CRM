'use client';

import React, { useEffect, useState } from 'react';
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
  Filter
} from 'lucide-react';
import { ordersApi, inventoryApi, purchasesApi, shipmentsApi, usersApi, accountsApi, authApi } from '@/lib/api';

export default function DashboardOverview() {
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

      const allOrders = ordersRes.data || [];
      const allInv = invRes.data || [];
      const allPur = purRes.data || [];
      const allShip = shipRes.data || [];
      const allUsers = usersRes.data || [];
      const allAcc = accRes.data || [];
      const me = meRes?.data || null;

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
    (o) => o.status === 'Pending Review' || o.status === 'Make a Purchase' || o.status === 'Out of Stock'
  );

  const readyForShipmentOrdersList = displayOrders.filter(
    (o) => o.status === 'Ready for Shipment'
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
      (o) => o.status === 'Pending Review' || o.status === 'Make a Purchase' || o.status === 'Out of Stock'
    );
    
    return {
      pendingReviewOrders,
      activePurchaseOrders: displayPurchases,
    };
  };

  const cards = [
    { 
      id: 'orders', 
      title: ordersTimeRange === 'today' ? "Today's Orders" : `${ordersTimeRange.toUpperCase()} Orders`, 
      value: displayOrders.length, 
      subtitle: 'Click for Account-wise order breakdown',
      icon: ShoppingCart, 
      color: 'from-blue-600 to-indigo-600',
      timeRange: ordersTimeRange,
      setTimeRange: setOrdersTimeRange,
    },
    { 
      id: 'purchases', 
      title: purchasesTimeRange === 'today' ? "Today's Purchases" : `${purchasesTimeRange.toUpperCase()} Purchases`, 
      value: displayPurchases.length + pendingReviewOrdersList.length, 
      subtitle: 'Click for product qty & price requirement',
      icon: ShoppingBag, 
      color: 'from-amber-600 to-orange-600',
      timeRange: purchasesTimeRange,
      setTimeRange: setPurchasesTimeRange, 
    },
    { 
      id: 'inventory', 
      title: 'Inventory Stock', 
      value: inventoryList.length, 
      subtitle: `${lowStockCount} low stock alerts`,
      icon: Package, 
      color: 'from-emerald-600 to-teal-600', 
    },
    { 
      id: 'shipments', 
      title: 'Shipments Tracked', 
      value: displayShipments.length, 
      subtitle: 'Click to view carrier status',
      icon: Truck, 
      color: 'from-purple-600 to-pink-600',
      timeRange: shipmentsTimeRange,
      setTimeRange: setShipmentsTimeRange, 
    },
    { 
      id: 'employees', 
      title: 'Team Employees', 
      value: usersList.length, 
      subtitle: 'Click to view active staff',
      icon: Users, 
      color: 'from-cyan-600 to-blue-600', 
    },
    { 
      id: 'accounts', 
      title: 'Registered Accounts', 
      value: accountsList.length, 
      subtitle: 'Click to view market accounts',
      icon: Building2, 
      color: 'from-rose-600 to-red-600', 
    },
  ];

  return (
    <div className="space-y-8">
      {/* Top Header & Dashboard View Selector Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs text-blue-700 font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            CRM Operational Control Center
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {currentDashboard === 'superadmin' && '1. All-In-One Superadmin Dashboard'}
            {currentDashboard === 'purchase' && '2. Purchase Department Dashboard'}
            {currentDashboard === 'shipment' && '3. Shipment Logistics Dashboard'}
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Operational dashboard with individual time filters inside each card and department panel
          </p>
        </div>

        {/* Department View Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200 shrink-0">
          <button
            onClick={() => setCurrentDashboard('superadmin')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              currentDashboard === 'superadmin' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setCurrentDashboard('purchase')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              currentDashboard === 'purchase' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Purchase
          </button>
          <button
            onClick={() => setCurrentDashboard('shipment')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              currentDashboard === 'shipment' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Shipment
          </button>
        </div>
      </div>

      {/* Low Stock Warning Banner */}
      {lowStockCount > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3 text-amber-800 text-sm font-medium">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
            <span>Notice: <strong className="text-amber-900">{lowStockCount}</strong> product(s) in inventory are low or out of stock.</span>
          </div>
          <button
            onClick={() => setActiveModal('inventory')}
            className="text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors shadow-xs"
          >
            View Low Stock Details &rarr;
          </button>
        </div>
      )}

      {/* Grid Metrics Cards - WITH IN-CARD TIME FILTERS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              className="group text-left relative bg-white border border-slate-200 hover:border-blue-400 p-6 rounded-2xl transition-all duration-300 shadow-sm hover:shadow-md flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-9 h-9 rounded-lg bg-gradient-to-tr ${card.color} flex items-center justify-center text-white shadow-xs`}>
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <p className="text-xs font-bold uppercase text-slate-700 tracking-wider">{card.title}</p>
                </div>

                {/* Per-Card Time Filter Selector */}
                {card.setTimeRange && (
                  <select
                    value={card.timeRange}
                    onChange={(e: any) => card.setTimeRange(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-lg px-2 py-1 outline-none cursor-pointer"
                  >
                    <option value="today">Today</option>
                    <option value="week">Last Week</option>
                    <option value="month">Last Month</option>
                    <option value="year">This Year</option>
                    <option value="all">All Time</option>
                  </select>
                )}
              </div>

              <div 
                onClick={() => setActiveModal(card.id)} 
                className="cursor-pointer my-2"
              >
                <h3 className="text-3xl font-extrabold text-slate-900">{loading ? '...' : card.value}</h3>
              </div>

              <div 
                onClick={() => setActiveModal(card.id)}
                className="mt-2 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 group-hover:text-blue-600 font-medium cursor-pointer"
              >
                <span>{card.subtitle}</span>
                <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 text-blue-600" />
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 1. SUPERADMIN DASHBOARD ALL-IN-ONE PANELS */}
      {/* ========================================================================= */}
      {currentDashboard === 'superadmin' && (
        <div className="space-y-8">
          {/* SECTION A: ORDERS OVERVIEW TABLE */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-blue-600" />
                  Sales Orders & Account Activity ({displayOrders.length})
                </h2>
                <p className="text-xs text-slate-500">Live customer order list</p>
              </div>

              <div className="flex items-center gap-3">
                {/* Orders Time Range Selector */}
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <Filter className="w-3.5 h-3.5 text-slate-500 ml-1.5" />
                  <select
                    value={ordersTimeRange}
                    onChange={(e: any) => setOrdersTimeRange(e.target.value)}
                    className="text-xs font-semibold bg-transparent text-slate-800 outline-none pr-2 cursor-pointer"
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
                  className="text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-xs"
                >
                  Manage Orders &rarr;
                </a>
              </div>
            </div>

            {displayOrders.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm italic">
                No orders found for <strong className="uppercase">{ordersTimeRange}</strong>. Change filter above.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
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
                        <td className="py-3.5 px-4 font-bold text-emerald-700">${((ord.product_price || 0) * (ord.qty || 1)).toFixed(2)}</td>
                        <td className="py-3.5 px-4 text-xs font-semibold text-slate-600">{ord.account_name || 'Direct Sales'}</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            ord.status === 'Ready for Shipment'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : ord.status === 'Pending Review' || ord.status === 'Make a Purchase'
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
                <p className="text-xs text-slate-500">Orders requiring supplier purchase, quantities, and costs</p>
              </div>

              <div className="flex items-center gap-3">
                {/* Purchases Time Range Selector */}
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <Filter className="w-3.5 h-3.5 text-slate-500 ml-1.5" />
                  <select
                    value={purchasesTimeRange}
                    onChange={(e: any) => setPurchasesTimeRange(e.target.value)}
                    className="text-xs font-semibold bg-transparent text-slate-800 outline-none pr-2 cursor-pointer"
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
                  className="text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors shadow-xs"
                >
                  Manage Purchases &rarr;
                </a>
              </div>
            </div>

            {pendingReviewOrdersList.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs italic bg-slate-50 rounded-xl border border-slate-200">
                No orders waiting for purchase for <strong className="uppercase">{purchasesTimeRange}</strong>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-amber-50/70 text-amber-900 border-b border-amber-200 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-3">Order #</th>
                      <th className="py-3 px-3">Product Required</th>
                      <th className="py-3 px-3">Required Qty</th>
                      <th className="py-3 px-3">Unit Price ($)</th>
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
                        <td className="py-2.5 px-3 text-slate-700">${(ord.product_price || 0).toFixed(2)}</td>
                        <td className="py-2.5 px-3 font-bold text-emerald-700">${((ord.product_price || 0) * (ord.qty || 1)).toFixed(2)}</td>
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

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
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
                          <td className="py-2 px-3 font-semibold text-emerald-700">${item.price.toFixed(2)}</td>
                          <td className="py-2 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isLow ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
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
      {currentDashboard === 'purchase' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
              <div className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Orders Needing Purchase ({purchasesTimeRange.toUpperCase()})</div>
              <div className="text-3xl font-bold text-amber-600 mt-2">{pendingReviewOrdersList.length}</div>
            </div>
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
              <div className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Supplier Purchases ({purchasesTimeRange.toUpperCase()})</div>
              <div className="text-3xl font-bold text-slate-900 mt-2">{displayPurchases.length}</div>
            </div>
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
              <div className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Low Stock Products</div>
              <div className="text-3xl font-bold text-red-600 mt-2">{lowStockCount}</div>
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
                <p className="text-xs text-slate-500">Products, quantities, unit prices, and supplier cost</p>
              </div>
              <a
                href="/dashboard/purchases"
                className="text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors shadow-xs"
              >
                Go to Purchases Dept &rarr;
              </a>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-amber-50/70 text-amber-900 border-b border-amber-200 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-3">Order #</th>
                    <th className="py-3 px-3">Product Name</th>
                    <th className="py-3 px-3">Qty Required</th>
                    <th className="py-3 px-3">Unit Price ($)</th>
                    <th className="py-3 px-3">Total Purchase Cost</th>
                    <th className="py-3 px-3">Account Source</th>
                    <th className="py-3 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {pendingReviewOrdersList.map((ord: any) => (
                    <tr key={ord.id} className="hover:bg-amber-50/30">
                      <td className="py-2.5 px-3 font-mono font-semibold text-blue-600">{ord.order_number}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{ord.product_name}</td>
                      <td className="py-2.5 px-3 font-bold text-amber-700">{ord.qty} units</td>
                      <td className="py-2.5 px-3 text-slate-700">${(ord.product_price || 0).toFixed(2)}</td>
                      <td className="py-2.5 px-3 font-bold text-emerald-700">${((ord.product_price || 0) * (ord.qty || 1)).toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-slate-600">{ord.account_name || 'Direct Sales'}</td>
                      <td className="py-2.5 px-3 font-semibold text-amber-700">{ord.status}</td>
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
      {currentDashboard === 'shipment' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
              <div className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Orders Ready for Dispatch ({ordersTimeRange.toUpperCase()})</div>
              <div className="text-3xl font-bold text-purple-600 mt-2">{readyForShipmentOrdersList.length}</div>
            </div>
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
              <div className="text-xs font-semibold uppercase text-slate-500 tracking-wider">In-Transit Dispatches ({shipmentsTimeRange.toUpperCase()})</div>
              <div className="text-3xl font-bold text-blue-600 mt-2">{displayShipments.filter((s: any) => s.status !== 'Delivered').length}</div>
            </div>
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
              <div className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Total Delivered Shipments</div>
              <div className="text-3xl font-bold text-emerald-600 mt-2">{displayShipments.filter((s: any) => s.status === 'Delivered').length}</div>
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
      {/* 1. TOTAL ORDERS MODAL (WITH TIME FILTER & ACCOUNT BREAKDOWN) */}
      {/* ========================================================================= */}
      {activeModal === 'orders' && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-4xl rounded-2xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
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
                          ${data.totalRevenue.toFixed(2)} Total Value
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
                              <td className="py-2 px-3 font-semibold text-emerald-700">${((ord.product_price || 0) * ord.qty).toFixed(2)}</td>
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

            <div className="flex justify-end pt-2">
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
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-4xl rounded-2xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
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
                        <th className="py-3 px-3">Unit Price ($)</th>
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
                            <td className="py-2.5 px-3 text-slate-700">${(ord.product_price || 0).toFixed(2)}</td>
                            <td className="py-2.5 px-3 font-bold text-emerald-700">${totalCost.toFixed(2)}</td>
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
                          <td className="py-2.5 px-3 font-semibold text-emerald-700">${pur.purchase_value.toFixed(2)}</td>
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

            <div className="flex justify-end pt-2">
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
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-3xl rounded-2xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
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
                    <th className="py-3 px-3">Unit Price ($)</th>
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
                        <td className="py-2.5 px-3 font-semibold text-emerald-700">${item.price.toFixed(2)}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                              isLow
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

            <div className="flex justify-end pt-2">
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
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-4xl rounded-2xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
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
                      <td className="py-2.5 px-3 font-semibold text-emerald-700">${ship.shipment_cost.toFixed(2)}</td>
                      <td className="py-2.5 px-3 font-bold text-purple-700">{ship.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
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
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-2xl rounded-2xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
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

            <div className="flex justify-end pt-2">
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
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-2xl rounded-2xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
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

            <div className="flex justify-end pt-2">
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
