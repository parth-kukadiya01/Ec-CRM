'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShoppingCart,
  ShoppingBag,
  Truck,
  Building2,
  Plus,
  RefreshCw,
  Layers,
  ArrowUpRight,
  Filter,
  Search,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RotateCcw
} from 'lucide-react';
import { ordersApi, purchasesApi, shipmentsApi, accountsApi, authApi, getImageUrl } from '@/lib/api';
import ResizableTable from '@/components/ResizableTable';
import { hasPermission, getAllowedCompanies, getDefaultRoute } from '@/lib/permissions';

export default function DashboardOverview() {
  const router = useRouter();

  const [ordersList, setOrdersList] = useState<any[]>([]);
  const [purchasesList, setPurchasesList] = useState<any[]>([]);
  const [shipmentsList, setShipmentsList] = useState<any[]>([]);
  const [accountsList, setAccountsList] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filter for dashboard tables
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>('All');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const meRes = await authApi.getMe().catch(() => ({ data: null }));
      const user = meRes?.data || null;
      setCurrentUser(user);

      if (user && !hasPermission(user, 'dashboard')) {
        const redirectPath = getDefaultRoute(user);
        router.replace(redirectPath);
        return;
      }

      const ordersRes = await ordersApi.list().catch(() => ({ data: [] }));
      const purRes = await purchasesApi.list().catch(() => ({ data: [] }));
      const shipRes = await shipmentsApi.list().catch(() => ({ data: [] }));
      const accRes = await accountsApi.list().catch(() => ({ data: [] }));

      setOrdersList(ordersRes.data || []);
      setPurchasesList(purRes.data || []);
      setShipmentsList(shipRes.data || []);
      setAccountsList(accRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  // Allowed companies for current user (User 2 gets ADBH & Globle only; Admin/User 1 get all)
  const companyOptions = getAllowedCompanies(currentUser);

  // Helper to verify if an item belongs to user allowed companies
  const isAllowedCompany = (comp?: string) => {
    if (!comp) return true;
    if (currentUser?.is_admin || currentUser?.role_name === 'Super Admin' || currentUser?.role?.name === 'Super Admin') return true;
    const target = comp.trim().toLowerCase();
    return companyOptions.some(c => {
      const allowed = c.trim().toLowerCase();
      return target === allowed || target.includes(allowed) || allowed.includes(target);
    });
  };

  // Helper for Date Range checking
  const isDateInRange = (dateStr?: string) => {
    if (!dateStr) return true;
    const d = dateStr.split('T')[0];
    if (startDate && d < startDate) return false;
    if (endDate && d > endDate) return false;
    return true;
  };

  // Date Range and Allowed Company Filtered Lists
  const dateFilteredOrders = ordersList
    .filter(o => isAllowedCompany(o.company))
    .filter(o => isDateInRange(o.order_process_date || o.order_date || o.created_at));

  const dateFilteredPurchases = purchasesList
    .filter(p => isAllowedCompany(p.company))
    .filter(p => isDateInRange(p.order_date || p.created_at));

  const dateFilteredShipments = shipmentsList
    .filter(s => isDateInRange(s.created_at || s.shipment_date));

  // Filtered orders for table display (Company + Date Range)
  const displayOrders = selectedCompanyFilter === 'All'
    ? dateFilteredOrders
    : dateFilteredOrders.filter(o => (o.company || '').toLowerCase() === selectedCompanyFilter.toLowerCase());

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(displayOrders.length / pageSize));
  const paginatedOrders = displayOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCompanyFilter, startDate, endDate, pageSize]);

  // Company Counts (Date Filtered)
  const getCompanyCount = (comp: string) => {
    return dateFilteredOrders.filter(o => (o.company || '').toLowerCase() === comp.toLowerCase()).length;
  };

  // === INR Exchange Rate ===
  const USD_TO_INR = 85;

  // === Cost Calculations (All in INR ₹) ===
  const totalSalesRevenue = dateFilteredOrders.reduce((sum: number, o: any) => sum + (parseFloat(o.price_usd || o.product_price || 0) * (o.qty || 1)), 0);
  const totalPurchaseCost = dateFilteredPurchases.reduce((sum: number, p: any) => sum + (parseFloat(p.purchase_value || 0) + parseFloat(p.other_cost || 0) + parseFloat(p.extra_cost || 0)), 0);
  const totalShipmentCost = dateFilteredShipments.reduce((sum: number, s: any) => sum + parseFloat(s.shipment_cost || 0), 0);
  const totalOrderQty = dateFilteredOrders.reduce((sum: number, o: any) => sum + (parseInt(o.qty) || 1), 0);
  const totalExpenses = totalPurchaseCost + totalShipmentCost;
  const totalProfitLoss = totalSalesRevenue - totalExpenses;

  // Status counts
  const pendingOrders = dateFilteredOrders.filter((o: any) => !['Purchased', 'Ready to Ship', 'Shipped', 'Delivered'].includes(o.status)).length;
  const shippedOrders = dateFilteredOrders.filter((o: any) => o.status === 'Shipped').length;
  const deliveredOrders = dateFilteredOrders.filter((o: any) => o.status === 'Delivered').length;

  // === Per-Company Cost Breakdown (Using dynamic companyOptions) ===
  const companyStats = companyOptions.map(comp => {
    const compOrders = dateFilteredOrders.filter((o: any) => (o.company || '').toLowerCase() === comp.toLowerCase());
    const compPurchases = dateFilteredPurchases.filter((p: any) => (p.company || '').toLowerCase() === comp.toLowerCase());
    const compRevenue = compOrders.reduce((s: number, o: any) => s + (parseFloat(o.price_usd || 0) * (o.qty || 1)), 0);
    const compPurchaseCost = compPurchases.reduce((s: number, p: any) => s + (parseFloat(p.purchase_value || 0) + parseFloat(p.other_cost || 0) + parseFloat(p.extra_cost || 0)), 0);
    const compProfit = compRevenue - compPurchaseCost;
    return { name: comp, orders: compOrders.length, revenue: compRevenue, cost: compPurchaseCost, profit: compProfit };
  });

  // Helper: find purchase cost for an order
  const getOrderPurchaseCost = (orderId: number) => {
    const pur = dateFilteredPurchases.find((p: any) => p.order_id === orderId);
    if (!pur) return 0;
    return (parseFloat(pur.purchase_value || 0) + parseFloat(pur.other_cost || 0) + parseFloat(pur.extra_cost || 0));
  };

  return (
    <div className="space-y-4 font-sans text-[#2c3338]">

      {/* Date Range Filter Controls */}
      <div className="bg-white border border-[#c3c4c7] p-3 shadow-xs rounded-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-[#1d2327]">
          <Calendar className="w-4 h-4 text-[#2271b1]" />
          <span className="uppercase tracking-wider">Date Range Filter:</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-[#50575e]">Start Date:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1 bg-white border border-[#c3c4c7] rounded-xs text-xs outline-none focus:border-[#2271b1]"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-[#50575e]">End Date:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1 bg-white border border-[#c3c4c7] rounded-xs text-xs outline-none focus:border-[#2271b1]"
            />
          </div>
          {(startDate || endDate) && (
            <button
              onClick={() => { setStartDate(''); setEndDate(''); }}
              className="flex items-center gap-1 px-2.5 py-1 bg-[#f6f7f7] hover:bg-[#f0f0f1] text-[#d63638] font-bold border border-[#c3c4c7] rounded-xs transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Date</span>
            </button>
          )}
        </div>
      </div>

      {/* Row 1: Main Metric Widgets */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${currentUser?.is_admin ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4`}>
        <Link href="/dashboard/orders" className="group bg-white border border-[#c3c4c7] p-4 shadow-xs rounded-sm hover:border-[#2271b1] transition-all cursor-pointer">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase text-[#50575e] tracking-wider">Total Sales Orders</span>
            <div className="w-7 h-7 rounded bg-[#2271b1] text-white flex items-center justify-center"><ShoppingCart className="w-4 h-4" /></div>
          </div>
          <div className="text-2xl font-bold text-[#1d2327]">{loading ? '...' : dateFilteredOrders.length}</div>
          <div className="mt-2 pt-2 border-t border-[#f0f0f1] flex items-center justify-between text-[11px] text-[#2271b1] font-semibold">
            <span>View Orders</span><ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </Link>
        <Link href="/dashboard/purchases" className="group bg-white border border-[#c3c4c7] p-4 shadow-xs rounded-sm hover:border-[#2271b1] transition-all cursor-pointer">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase text-[#50575e] tracking-wider">Purchases Queue</span>
            <div className="w-7 h-7 rounded bg-[#135e96] text-white flex items-center justify-center"><ShoppingBag className="w-4 h-4" /></div>
          </div>
          <div className="text-2xl font-bold text-[#1d2327]">{loading ? '...' : dateFilteredPurchases.length}</div>
          <div className="mt-2 pt-2 border-t border-[#f0f0f1] flex items-center justify-between text-[11px] text-[#2271b1] font-semibold">
            <span>Review Purchases</span><ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </Link>
        <Link href="/dashboard/shipments" className="group bg-white border border-[#c3c4c7] p-4 shadow-xs rounded-sm hover:border-[#2271b1] transition-all cursor-pointer">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase text-[#50575e] tracking-wider">Dispatched Shipments</span>
            <div className="w-7 h-7 rounded bg-[#2c3338] text-white flex items-center justify-center"><Truck className="w-4 h-4" /></div>
          </div>
          <div className="text-2xl font-bold text-[#1d2327]">{loading ? '...' : dateFilteredShipments.length}</div>
          <div className="mt-2 pt-2 border-t border-[#f0f0f1] flex items-center justify-between text-[11px] text-[#2271b1] font-semibold">
            <span>Track Dispatches</span><ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </Link>
        {currentUser?.is_admin && (
          <Link href="/dashboard/roles" className="group bg-white border border-[#c3c4c7] p-4 shadow-xs rounded-sm hover:border-[#2271b1] transition-all cursor-pointer">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase text-[#50575e] tracking-wider">Registered Accounts</span>
              <div className="w-7 h-7 rounded bg-[#72aee6] text-[#1d2327] flex items-center justify-center"><Building2 className="w-4 h-4" /></div>
            </div>
            <div className="text-2xl font-bold text-[#1d2327]">{loading ? '...' : accountsList.length || 4}</div>
            <div className="mt-2 pt-2 border-t border-[#f0f0f1] flex items-center justify-between text-[11px] text-[#2271b1] font-semibold">
              <span>Manage Roles</span><ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        )}
      </div>

      {/* Admin Only: Row 2 (Financial Cost Summary) & Row 3 (Per-Company Cost Breakdown) */}
      {currentUser?.is_admin && (
        <>
          {/* Row 2: Financial Cost Summary (All INR ₹) */}
          <div className="bg-white border border-[#c3c4c7] shadow-xs rounded-sm overflow-hidden">
            <div className="p-3 bg-[#f0f0f1] border-b border-[#c3c4c7] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#2271b1]" />
              <h2 className="text-xs font-bold text-[#1d2327] uppercase tracking-wider">Financial Summary (All in ₹ INR)</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-0 divide-x divide-[#e0e0e0]">
              <div className="p-4 text-center">
                <div className="text-[10px] font-bold uppercase text-[#50575e] tracking-wider mb-1">Total Revenue</div>
                <div className="text-lg font-bold text-emerald-700">{loading ? '...' : `₹${totalSalesRevenue.toFixed(2)}`}</div>
                <div className="text-[10px] text-[#787c82] mt-0.5">{totalOrderQty} items</div>
              </div>
              <div className="p-4 text-center">
                <div className="text-[10px] font-bold uppercase text-[#50575e] tracking-wider mb-1">Purchase Cost</div>
                <div className="text-lg font-bold text-[#d63638]">{loading ? '...' : `₹${totalPurchaseCost.toFixed(2)}`}</div>
                <div className="text-[10px] text-[#787c82] mt-0.5">{dateFilteredPurchases.length} purchases</div>
              </div>
              <div className="p-4 text-center">
                <div className="text-[10px] font-bold uppercase text-[#50575e] tracking-wider mb-1">Shipment Cost</div>
                <div className="text-lg font-bold text-[#2271b1]">{loading ? '...' : `₹${totalShipmentCost.toFixed(2)}`}</div>
                <div className="text-[10px] text-[#787c82] mt-0.5">{dateFilteredShipments.length} dispatches</div>
              </div>
              <div className="p-4 text-center border-l-2 border-[#c3c4c7]">
                <div className="text-[10px] font-bold uppercase text-[#50575e] tracking-wider mb-1">Net Profit / Loss</div>
                <div className={`text-lg font-bold ${totalProfitLoss >= 0 ? 'text-emerald-700' : 'text-[#d63638]'}`}>
                  {loading ? '...' : `${totalProfitLoss >= 0 ? '+' : ''}₹${totalProfitLoss.toFixed(2)}`}
                </div>
                <div className="text-[10px] text-[#787c82] mt-0.5">{totalProfitLoss >= 0 ? 'profit' : 'loss'}</div>
              </div>
              <div className="p-4 text-center">
                <div className="text-[10px] font-bold uppercase text-[#50575e] tracking-wider mb-1">Pending</div>
                <div className="text-lg font-bold text-amber-600">{loading ? '...' : pendingOrders}</div>
                <div className="text-[10px] text-[#787c82] mt-0.5">awaiting</div>
              </div>
              <div className="p-4 text-center">
                <div className="text-[10px] font-bold uppercase text-[#50575e] tracking-wider mb-1">Shipped</div>
                <div className="text-lg font-bold text-blue-700">{loading ? '...' : shippedOrders}</div>
                <div className="text-[10px] text-[#787c82] mt-0.5">in transit</div>
              </div>
              <div className="p-4 text-center">
                <div className="text-[10px] font-bold uppercase text-[#50575e] tracking-wider mb-1">Delivered</div>
                <div className="text-lg font-bold text-purple-700">{loading ? '...' : deliveredOrders}</div>
                <div className="text-[10px] text-[#787c82] mt-0.5">completed</div>
              </div>
            </div>
          </div>

          {/* Row 3: Per-Company Cost Breakdown with Profit/Loss */}
          <div className="bg-white border border-[#c3c4c7] shadow-xs rounded-sm overflow-hidden">
            <div className="p-3 bg-[#f0f0f1] border-b border-[#c3c4c7] flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#2271b1]" />
              <h2 className="text-xs font-bold text-[#1d2327] uppercase tracking-wider">Company-wise Cost & Profit / Loss (₹ INR)</h2>
            </div>
            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${Math.min(companyStats.length, 4)} gap-0`}>
              {companyStats.map((cs) => (
                <div key={cs.name} className="p-4 border-b border-r border-[#e0e0e0]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[#1d2327] uppercase">{cs.name}</span>
                    <span className="text-[10px] font-semibold text-[#787c82]">{cs.orders} orders</span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#50575e]">Revenue:</span>
                      <span className="font-bold text-emerald-700">₹{cs.revenue.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#50575e]">Purchase Cost:</span>
                      <span className="font-bold text-[#d63638]">₹{cs.cost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between pt-1.5 border-t border-[#e0e0e0]">
                      <span className="font-bold text-[#1d2327]">Profit / Loss:</span>
                      <span className={`font-bold ${cs.profit >= 0 ? 'text-emerald-700' : 'text-[#d63638]'}`}>
                        {cs.profit >= 0 ? '+' : ''}₹{cs.profit.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Company Quick Filter */}
      <div className="bg-[#f6f7f7] border border-[#c3c4c7] p-3 shadow-xs rounded-sm">
        <div className="text-xs font-bold text-[#1d2327] uppercase tracking-wider mb-2.5 flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#2271b1]" />
          Company Orders Quick Filter:
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-bold">
          <button
            onClick={() => setSelectedCompanyFilter('All')}
            className={`p-2.5 rounded-xs border text-left transition-all ${selectedCompanyFilter === 'All'
              ? 'bg-[#2271b1] text-white border-[#2271b1] shadow-xs'
              : 'bg-white text-[#2c3338] border-[#c3c4c7] hover:bg-[#f0f0f1]'
              }`}
          >
            <div>All Companies</div>
            <div className="text-sm">{dateFilteredOrders.length} orders</div>
          </button>
          {companyOptions.map(c => (
            <button
              key={c}
              onClick={() => setSelectedCompanyFilter(c)}
              className={`p-2.5 rounded-xs border text-left transition-all ${selectedCompanyFilter === c
                ? 'bg-[#2271b1] text-white border-[#2271b1] shadow-xs'
                : 'bg-white text-[#2c3338] border-[#c3c4c7] hover:bg-[#f0f0f1]'
                }`}
            >
              <div>{c}</div>
              <div className="text-sm">{getCompanyCount(c)} orders</div>
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table with Cost Columns & Pagination */}
      <div className="bg-white border border-[#c3c4c7] shadow-xs rounded-sm overflow-hidden">
        <div className="p-3.5 bg-[#f0f0f1] border-b border-[#c3c4c7] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-[#2271b1]" />
            <h2 className="text-xs font-bold text-[#1d2327] uppercase tracking-wider">
              Recent Sales Orders Dataset ({displayOrders.length})
            </h2>
          </div>
          <Link href="/dashboard/orders" className="text-xs font-bold text-[#2271b1] hover:underline flex items-center gap-1">
            <span>View Full Dataset</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <div className="w-6 h-6 border-2 border-[#2271b1] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span className="text-xs text-[#50575e]">Loading dataset...</span>
          </div>
        ) : displayOrders.length === 0 ? (
          <div className="py-12 text-center">
            <ShoppingCart className="w-8 h-8 text-[#a7aaad] mx-auto mb-2" />
            <p className="text-xs text-[#50575e]">No orders found for selected date & company filters.</p>
          </div>
        ) : (
          <>
            <div className="table-container overflow-x-auto">
              <ResizableTable className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#f6f7f7] text-[#1d2327] font-bold border-b border-[#c3c4c7] whitespace-nowrap">
                    <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Date</th>
                    <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Company</th>
                    <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Order ID</th>
                    <th className="py-2.5 px-3 border-r border-[#c3c4c7] min-w-[180px]">Product Name</th>
                    <th className="py-2.5 px-3 border-r border-[#c3c4c7] text-center">Qty</th>
                    <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Sale Price (₹)</th>
                    {currentUser?.is_admin && (
                      <>
                        <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Purchase Cost (₹)</th>
                        <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Profit / Loss (₹)</th>
                      </>
                    )}
                    <th className="py-2.5 px-3 border-r border-[#c3c4c7]">Buyer</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dcdcde]">
                  {paginatedOrders.map((ord, idx) => {
                    const saleInr = parseFloat(ord.price_usd || ord.product_price || 0) * (ord.qty || 1);
                    const purCost = getOrderPurchaseCost(ord.id);
                    const orderProfit = saleInr - purCost;
                    return (
                      <tr key={ord.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-[#f6f7f7]'} hover:bg-[#e8f3fc] transition-colors whitespace-nowrap`}>
                        <td className="py-2 px-3 border-r border-[#e0e0e0] font-medium">{ord.order_process_date || ord.order_date || '—'}</td>
                        <td className="py-2 px-3 border-r border-[#e0e0e0] font-bold text-[#1d2327]">{ord.company || 'ADBH'}</td>
                        <td className="py-2 px-3 border-r border-[#e0e0e0] font-mono font-bold text-[#2271b1]">{ord.order_number}</td>
                        <td className="py-2 px-3 border-r border-[#e0e0e0] font-semibold max-w-[220px] truncate" title={ord.product_name}>
                          <div className="flex items-center gap-2">
                            {ord.product_image ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={getImageUrl(ord.product_image)}
                                alt=""
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                                className="w-6 h-6 rounded-xs object-cover border border-[#c3c4c7] shrink-0"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-xs bg-[#f6f7f7] border border-[#c3c4c7] flex items-center justify-center text-[#50575e] font-bold text-[9px] shrink-0">
                                📦
                              </div>
                            )}
                            <span className="truncate">{ord.product_name}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 border-r border-[#e0e0e0] text-center font-bold">{ord.qty}</td>
                        <td className="py-2 px-3 border-r border-[#e0e0e0] font-bold text-emerald-700">₹{saleInr.toFixed(2)}</td>
                        {currentUser?.is_admin && (
                          <>
                            <td className="py-2 px-3 border-r border-[#e0e0e0] font-bold text-[#d63638]">{purCost > 0 ? `₹${purCost.toFixed(2)}` : '—'}</td>
                            <td className={`py-2 px-3 border-r border-[#e0e0e0] font-bold ${purCost > 0 ? (orderProfit >= 0 ? 'text-emerald-700' : 'text-[#d63638]') : 'text-[#787c82]'}`}>
                              {purCost > 0 ? `${orderProfit >= 0 ? '+' : ''}₹${orderProfit.toFixed(2)}` : '—'}
                            </td>
                          </>
                        )}
                        <td className="py-2 px-3 border-r border-[#e0e0e0] font-bold">{ord.buyer_name}</td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 font-bold text-[10px] uppercase rounded-xs border ${ord.status === 'Delivered' ? 'bg-purple-100 text-purple-900 border-purple-300'
                            : ord.status === 'Shipped' ? 'bg-blue-100 text-blue-900 border-blue-300'
                              : ord.status === 'Purchased' ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : ord.status === 'Ready to Ship' || ord.status === 'Ready for Shipment' ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                  : 'bg-[#f0f0f1] text-[#1d2327] border-[#c3c4c7]'
                            }`}>
                            {ord.status || 'ADBH'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </ResizableTable>
            </div>

            {/* Pagination Controls Footer */}
            <div className="p-3 bg-[#f6f7f7] border-t border-[#c3c4c7] flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-1.5 text-[#50575e]">
                <span className="font-medium">Total:</span>
                <span className="font-bold text-[#1d2327]">{displayOrders.length} entries</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[#50575e]">Show:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="px-2 py-1 bg-white border border-[#c3c4c7] rounded-xs text-xs font-bold outline-none cursor-pointer"
                  >
                    <option value={10}>10 per page</option>
                    <option value={25}>25 per page</option>
                    <option value={50}>50 per page</option>
                    <option value={100}>100 per page</option>
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-2.5 py-1 bg-white border border-[#c3c4c7] rounded-xs font-bold text-[#2c3338] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#f0f0f1] transition-all flex items-center gap-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Prev</span>
                  </button>

                  <span className="px-2.5 py-1 font-bold text-[#1d2327]">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage >= totalPages}
                    className="px-2.5 py-1 bg-white border border-[#c3c4c7] rounded-xs font-bold text-[#2c3338] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#f0f0f1] transition-all flex items-center gap-1"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

