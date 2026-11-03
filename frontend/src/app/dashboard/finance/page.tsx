'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  IndianRupee,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingCart,
  ShoppingBag,
  Truck,
  Users,
  Receipt,
  BarChart3,
  PieChart,
  Package,
  ShieldAlert,
  Calendar,
  Loader2,
  AlertTriangle,
  Download,
  Printer,
  Building2,
  Store,
  Search,
  CheckCircle2,
  Clock,
  RotateCcw,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { financeApi, authApi, companiesApi, partnersMgmtApi } from '@/lib/api';

type Period = 'today' | 'week' | 'month' | 'year' | 'all' | 'custom';
type CurrencyMode = 'USD' | 'INR';

export default function FinancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  // Top Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'reports'>('overview');

  // ── Global Overview State ──
  const [period, setPeriod] = useState<Period>('all');
  const [summary, setSummary] = useState<any>(null);
  const [breakdown, setBreakdown] = useState<any>(null);

  // ── Company & Partner Report State ──
  const [companiesList, setCompaniesList] = useState<any[]>([]);
  const [partnersList, setPartnersList] = useState<any[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('');
  const [reportPeriod, setReportPeriod] = useState<Period>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [currencyMode, setCurrencyMode] = useState<CurrencyMode>('USD');
  const [exchangeRate, setExchangeRate] = useState<number>(84.0);
  const [exchangeRateInput, setExchangeRateInput] = useState<string>('84');

  const handleApplyExchangeRate = () => {
    const val = parseFloat(exchangeRateInput);
    if (!isNaN(val) && val > 0) {
      setExchangeRate(val);
    } else {
      setExchangeRateInput(String(exchangeRate || 84.0));
    }
  };

  const [reportLoading, setReportLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [ledgerSearch, setLedgerSearch] = useState<string>('');

  // Auth check — admin only
  useEffect(() => {
    authApi
      .getMe()
      .then((res) => {
        if (res.data?.is_admin) {
          setAuthorized(true);
        } else {
          router.push('/dashboard');
        }
      })
      .catch(() => router.push('/dashboard'));
  }, [router]);

  // Load Global Overview data
  useEffect(() => {
    if (!authorized) return;
    loadOverviewData();
  }, [period, authorized]);

  // Load Companies & Partners lists for report filters
  useEffect(() => {
    if (!authorized) return;
    Promise.all([
      companiesApi.list({ limit: 100 }),
      partnersMgmtApi.list({ limit: 100 }),
    ])
      .then(([compRes, partRes]) => {
        setCompaniesList(compRes.data || []);
        setPartnersList(partRes.data || []);
      })
      .catch((err) => console.error('Failed to load companies/partners', err));
  }, [authorized]);

  // Trigger report fetch when report filters change
  useEffect(() => {
    if (!authorized || activeTab !== 'reports') return;
    loadCompanyPartnerReport();
  }, [
    authorized,
    activeTab,
    selectedCompanyId,
    selectedPartnerId,
    reportPeriod,
    customStartDate,
    customEndDate,
    selectedStatus,
    exchangeRate,
  ]);

  const loadOverviewData = async () => {
    setLoading(true);
    try {
      const [summaryRes, breakdownRes] = await Promise.all([
        financeApi.getSummary(period),
        financeApi.getBreakdown(period),
      ]);
      setSummary(summaryRes.data);
      setBreakdown(breakdownRes.data);
    } catch (err) {
      console.error('Failed to load finance data', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCompanyPartnerReport = async () => {
    setReportLoading(true);
    try {
      const params: any = {
        exchange_rate: exchangeRate || 84.0,
      };
      if (selectedCompanyId) params.company_id = Number(selectedCompanyId);
      if (selectedPartnerId) params.partner_id = Number(selectedPartnerId);
      if (reportPeriod !== 'custom') {
        params.period = reportPeriod;
      } else {
        params.period = 'custom';
        if (customStartDate) params.start_date = customStartDate;
        if (customEndDate) params.end_date = customEndDate;
      }
      if (selectedStatus && selectedStatus !== 'All') {
        params.order_status = selectedStatus;
      }

      const res = await financeApi.getCompanyPartnerReport(params);
      setReportData(res.data);
    } catch (err) {
      console.error('Failed to load company/partner report', err);
    } finally {
      setReportLoading(false);
    }
  };

  // Currency formatters
  const formatCurrency = (value: number) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
    return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatFullCurrency = (value: number) => {
    return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatMoney = (valUsd: number, valInr: number) => {
    if (currencyMode === 'USD') {
      return `$${(valUsd || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `₹${(valInr || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Filtered ledger rows for report view
  const filteredLedger = useMemo(() => {
    if (!reportData?.ledger) return [];
    if (!ledgerSearch.trim()) return reportData.ledger;
    const q = ledgerSearch.toLowerCase().trim();
    return reportData.ledger.filter(
      (row: any) =>
        (row.order_number || '').toLowerCase().includes(q) ||
        (row.product_name || '').toLowerCase().includes(q) ||
        (row.account_name || '').toLowerCase().includes(q) ||
        (row.company || '').toLowerCase().includes(q)
    );
  }, [reportData?.ledger, ledgerSearch]);

  // CSV Export Generator (Client-Side immediate download)
  const handleDownloadCSV = () => {
    if (!reportData) return;

    const summaryData = reportData.summary || {};
    const compName = reportData.company?.company_name || 'All_Companies';
    const partName = reportData.partner?.partner_name || 'All_Partners';

    const rows: string[][] = [];

    // Header info
    rows.push(['FINANCIAL REPORT - COMPANY & PARTNER AUDIT STATEMENT']);
    rows.push(['Generated At', new Date().toLocaleString()]);
    rows.push(['Company', compName]);
    rows.push(['Partner', partName]);
    if (reportData.partner) {
      rows.push(['Partner Type', reportData.partner.partner_type || 'Service']);
      rows.push(['Partner Profit Share %', `${reportData.partner.partner_share_percentage}%`]);
      rows.push(['RBS Settlement Type', reportData.partner.rbs_type || 'Credit']);
    }
    rows.push(['Period Filter', reportPeriod.toUpperCase()]);
    rows.push(['Forex Exchange Rate', `1 USD = ${exchangeRate} INR`]);
    rows.push([]);

    // Executive Summary
    rows.push(['=== FINANCIAL SUMMARY KPI ===']);
    rows.push(['Metric', 'USD Value ($)', 'INR Value (₹)']);
    rows.push(['Total Delivered Orders', String(summaryData.total_orders || 0), '']);
    rows.push(['Total Units Sold', String(summaryData.total_units_sold || 0), '']);
    rows.push([
      'Gross Sales Revenue',
      `$${(summaryData.gross_revenue_usd || 0).toFixed(2)}`,
      `INR ${(summaryData.gross_revenue_inr || 0).toFixed(2)}`,
    ]);
    rows.push([
      'Procurement Cost (COGS)',
      `$${(summaryData.total_cogs_usd || 0).toFixed(2)}`,
      `INR ${(summaryData.total_cogs_inr || 0).toFixed(2)}`,
    ]);
    rows.push([
      'Logistics & Shipping Cost',
      `$${(summaryData.total_shipping_usd || 0).toFixed(2)}`,
      `INR ${(summaryData.total_shipping_inr || 0).toFixed(2)}`,
    ]);
    rows.push([
      'Gross Profit',
      `$${(summaryData.gross_profit_usd || 0).toFixed(2)}`,
      `INR ${(summaryData.gross_profit_inr || 0).toFixed(2)}`,
    ]);
    rows.push(['Gross Margin %', `${summaryData.gross_margin_pct || 0}%`, '']);
    rows.push([
      'Partner Profit Share Cut',
      `$${(summaryData.partner_share_usd || 0).toFixed(2)}`,
      `INR ${(summaryData.partner_share_inr || 0).toFixed(2)}`,
    ]);
    rows.push([
      'Company Retained Profit',
      `$${(summaryData.company_net_profit_usd || 0).toFixed(2)}`,
      `INR ${(summaryData.company_net_profit_inr || 0).toFixed(2)}`,
    ]);
    rows.push([]);

    // Detailed Ledger Table
    rows.push(['=== TRANSACTION & ORDER LEDGER ===']);
    rows.push([
      'Order Number',
      'Order Date',
      'Company',
      'Account / Store',
      'Product Name',
      'Qty',
      'Selling Price (USD)',
      'Total Revenue (USD)',
      'Total Revenue (INR)',
      'Procurement Cost (INR)',
      'Procurement Cost (USD)',
      'Shipping Cost (USD)',
      'Gross Margin (USD)',
      'Gross Margin (INR)',
      'Partner Share %',
      'Partner Cut (USD)',
      'Partner Cut (INR)',
      'Company Net (USD)',
      'Order Status',
      'Payment Status',
    ]);

    (reportData.ledger || []).forEach((row: any) => {
      rows.push([
        row.order_number || '',
        row.order_date || '',
        row.company || '',
        row.account_name || '',
        `"${(row.product_name || '').replace(/"/g, '""')}"`,
        String(row.qty || 1),
        Number(row.price_usd || 0).toFixed(2),
        Number(row.rev_usd || 0).toFixed(2),
        Number(row.rev_inr || 0).toFixed(2),
        Number(row.cogs_inr || 0).toFixed(2),
        Number(row.cogs_usd || 0).toFixed(2),
        Number(row.shipping_cost_usd || 0).toFixed(2),
        Number(row.gross_profit_usd || 0).toFixed(2),
        Number(row.gross_profit_inr || 0).toFixed(2),
        `${row.partner_share_pct || 0}%`,
        Number(row.partner_cut_usd || 0).toFixed(2),
        Number(row.partner_cut_inr || 0).toFixed(2),
        Number(row.company_net_usd || 0).toFixed(2),
        row.order_status || '',
        row.payment_status || '',
      ]);
    });

    const csvContent = '\ufeff' + rows.map((e) => e.join(',')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const cleanComp = compName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const cleanPart = partName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const timestamp = new Date().toISOString().slice(0, 10);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `Financial_Report_${cleanComp}_${cleanPart}_${timestamp}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!authorized) {
    return (
      <div className="py-16 text-center bg-white border border-[#c3c4c7] p-8 max-w-lg mx-auto mt-10 rounded-sm shadow-xs">
        <ShieldAlert className="w-12 h-12 text-[#d63638] mx-auto mb-3" />
        <h2 className="text-lg font-bold text-[#1d2327]">Access Restricted</h2>
        <p className="text-xs text-[#50575e] mt-1">
          Admin access is required to view financial statements.
        </p>
      </div>
    );
  }

  const profitIsPositive = (summary?.profit?.net_profit || 0) >= 0;
  const maxMonthlyValue = Math.max(
    ...(breakdown?.monthly_trends || []).map((m: any) => Math.max(m.revenue, m.expenses)),
    1
  );

  return (
    <div className="space-y-4 font-sans text-[#2c3338]">
      {/* ═══ WP Admin Header ═══ */}
      <div className="bg-white border border-[#c3c4c7] p-4 shadow-xs rounded-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#1d2327] tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-6 bg-[#2271b1] inline-block rounded-xs" />
              Finance Overview & Entity Reports
            </h1>
            <span className="bg-[#2271b1] text-white border border-[#135e96] text-xs font-bold px-2 py-0.5 rounded-xs">
              Admin
            </span>
          </div>
          <p className="text-xs text-[#50575e] mt-1">
            Enterprise Profit & Loss, Company & Partner profit settlements, procurement cost analysis
          </p>
        </div>
      </div>

      {/* ═══ Tab Navigation ═══ */}
      <div className="flex items-center gap-2 border-b border-[#c3c4c7] pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-xs transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-[#2271b1] text-white shadow-xs'
              : 'bg-[#f6f7f7] text-[#2c3338] border border-[#c3c4c7] hover:bg-[#f0f0f1]'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Global Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-xs transition-all cursor-pointer ${
            activeTab === 'reports'
              ? 'bg-[#2271b1] text-white shadow-xs'
              : 'bg-[#f6f7f7] text-[#2c3338] border border-[#c3c4c7] hover:bg-[#f0f0f1]'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Company & Partner Reports</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'reports' ? 'bg-white text-[#2271b1]' : 'bg-[#e0e0e0] text-[#1d2327]'
            }`}
          >
            Export
          </span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          TAB 1: GLOBAL OVERVIEW
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Period Filter Toolbar */}
          <div className="bg-[#f6f7f7] border border-[#c3c4c7] p-2.5 shadow-xs rounded-sm flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold text-[#50575e]">Filter Time Period:</span>
            <div className="flex items-center gap-1">
              {(['today', 'week', 'month', 'year', 'all'] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1 rounded-xs text-xs font-bold transition-all cursor-pointer ${
                    period === p
                      ? 'bg-[#2271b1] text-white shadow-xs'
                      : 'bg-white text-[#2c3338] border border-[#c3c4c7] hover:bg-[#f0f0f1]'
                  }`}
                >
                  {p === 'all'
                    ? 'All Time'
                    : p === 'week'
                    ? 'This Week'
                    : p === 'month'
                    ? 'This Month'
                    : p === 'year'
                    ? 'This Year'
                    : 'Today'}
                </button>
              ))}
            </div>
          </div>

          {loading && !summary ? (
            <div className="py-16 text-center bg-white border border-[#c3c4c7] rounded-sm shadow-xs">
              <div className="w-7 h-7 border-2 border-[#2271b1] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span className="text-xs text-[#50575e] font-semibold">Loading financial data...</span>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Total Revenue */}
                <div className="bg-white border border-[#c3c4c7] p-3.5 shadow-xs rounded-sm">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-[#50575e] uppercase tracking-wider">
                      Total Revenue
                    </span>
                    <TrendingUp className="w-4 h-4 text-[#00a32a]" />
                  </div>
                  <p className="text-[20px] font-extrabold text-[#1d2327]">
                    {formatCurrency(summary?.revenue?.total_revenue || 0)}
                  </p>
                  <p className="text-xs text-[#50575e] mt-1">
                    {summary?.revenue?.orders_count || 0} orders · Commission:{' '}
                    {formatCurrency(summary?.revenue?.total_commission || 0)}
                  </p>
                </div>

                {/* Total Expenses */}
                <div className="bg-white border border-[#c3c4c7] p-3.5 shadow-xs rounded-sm">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-[#50575e] uppercase tracking-wider">
                      Total Expenses
                    </span>
                    <TrendingDown className="w-4 h-4 text-[#d63638]" />
                  </div>
                  <p className="text-[20px] font-extrabold text-[#1d2327]">
                    {formatCurrency(summary?.expenses?.total_expenses || 0)}
                  </p>
                  <p className="text-xs text-[#50575e] mt-1">
                    Purchases: {formatCurrency(summary?.expenses?.total_purchases || 0)} · Ship:{' '}
                    {formatCurrency(summary?.expenses?.total_shipment_cost || 0)}
                  </p>
                </div>

                {/* Net Profit */}
                <div className="bg-white border border-[#c3c4c7] p-3.5 shadow-xs rounded-sm">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-[#50575e] uppercase tracking-wider">
                      Net Profit / Loss
                    </span>
                    {profitIsPositive ? (
                      <span className="text-[10px] font-bold text-[#00a32a] bg-[#edfaef] px-1.5 py-0.5 rounded-xs border border-[#00a32a]/30">
                        Profit
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-[#d63638] bg-[#fcf0f1] px-1.5 py-0.5 rounded-xs border border-[#d63638]/30">
                        Loss
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-[20px] font-extrabold ${
                      profitIsPositive ? 'text-[#00a32a]' : 'text-[#d63638]'
                    }`}
                  >
                    {profitIsPositive ? '+' : ''}
                    {formatCurrency(summary?.profit?.net_profit || 0)}
                  </p>
                  <p className="text-xs text-[#50575e] mt-1">Revenue minus all expenses</p>
                </div>

                {/* Profit Margin */}
                <div className="bg-white border border-[#c3c4c7] p-3.5 shadow-xs rounded-sm">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-[#50575e] uppercase tracking-wider">
                      Profit Margin
                    </span>
                    <PieChart className="w-4 h-4 text-[#2271b1]" />
                  </div>
                  <p
                    className={`text-[20px] font-extrabold ${
                      (summary?.profit?.profit_margin || 0) >= 0 ? 'text-[#1d2327]' : 'text-[#d63638]'
                    }`}
                  >
                    {summary?.profit?.profit_margin || 0}%
                  </p>
                  <p className="text-xs text-[#50575e] mt-1">Overall margin efficiency</p>
                </div>
              </div>

              {/* Monthly Trend Chart */}
              <div className="bg-white border border-[#c3c4c7] shadow-xs rounded-sm overflow-hidden">
                <div className="bg-[#f6f7f7] border-b border-[#c3c4c7] px-4 py-2.5 flex items-center justify-between">
                  <h2 className="text-xs font-bold text-[#1d2327] uppercase tracking-wider flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4 text-[#2271b1]" />
                    Monthly Revenue vs Expenses Trend
                  </h2>
                  <div className="flex items-center gap-3 text-xs font-bold">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 bg-[#00a32a] inline-block rounded-xs" /> Revenue
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 bg-[#d63638] inline-block rounded-xs" /> Expenses
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  {breakdown?.monthly_trends && breakdown.monthly_trends.length > 0 ? (
                    <div className="flex items-end gap-2 h-[180px] pt-4">
                      {breakdown.monthly_trends.map((month: any, idx: number) => {
                        const revenueHeight =
                          maxMonthlyValue > 0 ? (month.revenue / maxMonthlyValue) * 140 : 0;
                        const expenseHeight =
                          maxMonthlyValue > 0 ? (month.expenses / maxMonthlyValue) * 140 : 0;
                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                            <div className="flex items-end gap-1 w-full justify-center">
                              <div
                                className="w-3 bg-[#00a32a] rounded-xs"
                                style={{ height: `${Math.max(revenueHeight, 3)}px` }}
                                title={`Revenue: ${formatFullCurrency(month.revenue)}`}
                              />
                              <div
                                className="w-3 bg-[#d63638] rounded-xs"
                                style={{ height: `${Math.max(expenseHeight, 3)}px` }}
                                title={`Expenses: ${formatFullCurrency(month.expenses)}`}
                              />
                            </div>
                            <span className="text-[10px] text-[#50575e] font-bold mt-1">
                              {month.month_short}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-10 text-center text-xs text-[#50575e]">No trend data available</div>
                  )}
                </div>
              </div>

              {/* Accounts & Top Products Tables */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Store Accounts */}
                <div className="bg-white border border-[#c3c4c7] shadow-xs rounded-sm overflow-hidden">
                  <div className="bg-[#f6f7f7] border-b border-[#c3c4c7] px-4 py-2.5">
                    <h2 className="text-xs font-bold text-[#1d2327] uppercase tracking-wider flex items-center gap-1.5">
                      <ShoppingCart className="w-4 h-4 text-[#2271b1]" />
                      Revenue by Marketplace Account
                    </h2>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#f6f7f7] border-b border-[#c3c4c7] text-[#50575e] font-bold">
                          <th className="px-3 py-2">Account</th>
                          <th className="px-3 py-2 text-center">Orders</th>
                          <th className="px-3 py-2 text-right">Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f0f0f1]">
                        {(breakdown?.revenue_by_account || []).map((acc: any, idx: number) => (
                          <tr key={idx} className="hover:bg-[#f6f7f7]">
                            <td className="px-3 py-2 font-bold text-[#2271b1]">{acc.account}</td>
                            <td className="px-3 py-2 text-center text-[#50575e]">{acc.orders}</td>
                            <td className="px-3 py-2 text-right font-bold text-[#00a32a]">
                              {formatCurrency(acc.revenue)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Top Selling Products */}
                <div className="bg-white border border-[#c3c4c7] shadow-xs rounded-sm overflow-hidden">
                  <div className="bg-[#f6f7f7] border-b border-[#c3c4c7] px-4 py-2.5">
                    <h2 className="text-xs font-bold text-[#1d2327] uppercase tracking-wider flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-[#dba617]" />
                      Top Performing Products
                    </h2>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#f6f7f7] border-b border-[#c3c4c7] text-[#50575e] font-bold">
                          <th className="px-3 py-2">Product</th>
                          <th className="px-3 py-2 text-center">Qty</th>
                          <th className="px-3 py-2 text-right">Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f0f0f1]">
                        {(breakdown?.top_products || []).slice(0, 8).map((prod: any, idx: number) => (
                          <tr key={idx} className="hover:bg-[#f6f7f7]">
                            <td className="px-3 py-2 font-semibold text-[#2c3338] truncate max-w-[200px]" title={prod.product}>
                              {prod.product}
                            </td>
                            <td className="px-3 py-2 text-center text-[#50575e]">{prod.qty_sold}</td>
                            <td className="px-3 py-2 text-right font-bold text-[#00a32a]">
                              {formatCurrency(prod.revenue)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB 2: COMPANY & PARTNER REPORTS & CSV DOWNLOAD
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          {/* ── Filter Controls Bar ── */}
          <div className="bg-white border border-[#c3c4c7] p-3 shadow-xs rounded-sm space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#c3c4c7] pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#2271b1]" />
                <span className="text-xs font-bold text-[#1d2327] uppercase tracking-wide">
                  Generate Company & Partner Audit Report
                </span>
                {reportLoading && (
                  <span className="flex items-center gap-1 text-[11px] text-[#2271b1] font-semibold">
                    <Loader2 className="w-3 h-3 animate-spin" /> Updating...
                  </span>
                )}
              </div>

              {/* Action Buttons: Download CSV & Print */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadCSV}
                  disabled={reportLoading || !reportData?.ledger?.length}
                  className="px-3.5 py-1.5 bg-[#00a32a] hover:bg-[#008a20] text-white text-xs font-bold rounded-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Download complete financial audit report in CSV format"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download CSV Report</span>
                </button>

                <button
                  onClick={() => window.print()}
                  disabled={reportLoading}
                  className="px-3 py-1.5 bg-[#f6f7f7] hover:bg-[#f0f0f1] text-[#2c3338] border border-[#c3c4c7] text-xs font-bold rounded-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Print or Save as PDF statement"
                >
                  <Printer className="w-3.5 h-3.5 text-[#50575e]" />
                  <span>Print / PDF</span>
                </button>
              </div>
            </div>

            {/* Filter Dropdowns Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
              {/* Company Select */}
              <div>
                <label className="block text-[11px] font-bold text-[#50575e] uppercase mb-1">
                  Company
                </label>
                <select
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  className="w-full bg-white border border-[#8c8f94] text-xs font-semibold px-2.5 py-1.5 rounded-xs focus:border-[#2271b1] outline-none text-[#2c3338] cursor-pointer"
                >
                  <option value="">All Companies ({companiesList.length})</option>
                  {companiesList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name} {c.is_rbs ? '(RBS)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Partner Select */}
              <div>
                <label className="block text-[11px] font-bold text-[#50575e] uppercase mb-1">
                  Partner
                </label>
                <select
                  value={selectedPartnerId}
                  onChange={(e) => setSelectedPartnerId(e.target.value)}
                  className="w-full bg-white border border-[#8c8f94] text-xs font-semibold px-2.5 py-1.5 rounded-xs focus:border-[#2271b1] outline-none text-[#2c3338] cursor-pointer"
                >
                  <option value="">All Partners ({partnersList.length})</option>
                  {partnersList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.partner_name}{' '}
                      {p.partner_share_percentage ? `(${p.partner_share_percentage}%)` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Period Select */}
              <div>
                <label className="block text-[11px] font-bold text-[#50575e] uppercase mb-1">
                  Timeline
                </label>
                <select
                  value={reportPeriod}
                  onChange={(e) => setReportPeriod(e.target.value as Period)}
                  className="w-full bg-white border border-[#8c8f94] text-xs font-semibold px-2.5 py-1.5 rounded-xs focus:border-[#2271b1] outline-none text-[#2c3338] cursor-pointer"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="year">This Year</option>
                  <option value="custom">Custom Date Range</option>
                </select>
              </div>

              {/* Currency Mode Select */}
              <div>
                <label className="block text-[11px] font-bold text-[#50575e] uppercase mb-1">
                  Currency View
                </label>
                <select
                  value={currencyMode}
                  onChange={(e) => setCurrencyMode(e.target.value as CurrencyMode)}
                  className="w-full bg-white border border-[#8c8f94] text-xs font-semibold px-2.5 py-1.5 rounded-xs focus:border-[#2271b1] outline-none text-[#2c3338] cursor-pointer"
                >
                  <option value="USD">$ USD (US Dollar)</option>
                  <option value="INR">₹ INR (Indian Rupee)</option>
                </select>
              </div>

              {/* Forex Rate Input with Apply Button */}
              <div>
                <label className="block text-[11px] font-bold text-[#50575e] uppercase mb-1">
                  Exchange Rate (1$ = ₹)
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="84"
                    value={exchangeRateInput}
                    onChange={(e) => setExchangeRateInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleApplyExchangeRate();
                    }}
                    onBlur={handleApplyExchangeRate}
                    className="w-full bg-white border border-[#8c8f94] text-xs font-bold px-2 py-1.5 rounded-xs focus:border-[#2271b1] outline-none text-[#2c3338]"
                  />
                  <button
                    type="button"
                    onClick={handleApplyExchangeRate}
                    className="px-2.5 py-1.5 bg-[#2271b1] hover:bg-[#135e96] text-white text-xs font-bold rounded-xs shadow-xs cursor-pointer whitespace-nowrap"
                    title="Apply new exchange rate"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>

            {/* Custom Date Pickers */}
            {reportPeriod === 'custom' && (
              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#f0f0f1] text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-[#50575e]">Start Date:</span>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="bg-white border border-[#8c8f94] px-2 py-1 rounded-xs outline-none focus:border-[#2271b1]"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-[#50575e]">End Date:</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="bg-white border border-[#8c8f94] px-2 py-1 rounded-xs outline-none focus:border-[#2271b1]"
                  />
                </div>
                <button
                  onClick={loadCompanyPartnerReport}
                  className="px-3 py-1 bg-[#2271b1] hover:bg-[#135e96] text-white font-bold rounded-xs shadow-xs"
                >
                  Apply Dates
                </button>
              </div>
            )}
          </div>

          {/* ── Active Entity Status Banner ── */}
          {(reportData?.company || reportData?.partner) && (
            <div className="bg-[#f6f7f7] border border-[#c3c4c7] p-3 rounded-sm flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 flex-wrap font-bold">
                {reportData.company && (
                  <span className="px-2.5 py-1 bg-white border border-[#2271b1] text-[#2271b1] rounded-xs flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5" /> Company: {reportData.company.company_name}
                  </span>
                )}
                {reportData.partner && (
                  <span className="px-2.5 py-1 bg-white border border-[#dba617] text-[#1d2327] rounded-xs flex items-center gap-1">
                    <Store className="w-3.5 h-3.5 text-[#dba617]" /> Partner:{' '}
                    {reportData.partner.partner_name}
                  </span>
                )}
                {reportData.partner?.partner_share_percentage ? (
                  <span className="px-2 py-1 bg-[#dba617] text-white rounded-xs">
                    {reportData.partner.partner_share_percentage}% Profit Split
                  </span>
                ) : null}
                {reportData.partner?.rbs_type && (
                  <span className="px-2 py-1 bg-white border border-[#c3c4c7] text-[#50575e] rounded-xs">
                    RBS {reportData.partner.rbs_type}
                  </span>
                )}
              </div>
              <div className="text-right text-[#50575e] font-semibold">
                Matched Orders: <strong className="text-[#1d2327]">{reportData.summary?.total_orders || 0}</strong> ({reportData.summary?.total_units_sold || 0} units)
              </div>
            </div>
          )}

          {/* ── Loading Spinner / Report Content ── */}
          {reportLoading && !reportData ? (
            <div className="py-16 text-center bg-white border border-[#c3c4c7] rounded-sm shadow-xs">
              <div className="w-7 h-7 border-2 border-[#2271b1] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span className="text-xs text-[#50575e] font-semibold">Generating report...</span>
            </div>
          ) : reportData ? (
            <div className={reportLoading ? 'opacity-60 pointer-events-none transition-opacity space-y-4' : 'space-y-4'}>
              {/* ── Financial KPI Metric Cards (WP Admin Styled) ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                {/* Gross Revenue */}
                <div className="bg-white border border-[#c3c4c7] p-3 shadow-xs rounded-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-[#50575e] uppercase">Gross Revenue</span>
                    <TrendingUp className="w-3.5 h-3.5 text-[#00a32a]" />
                  </div>
                  <p className="text-[17px] font-extrabold text-[#1d2327]">
                    {formatMoney(
                      reportData.summary?.gross_revenue_usd,
                      reportData.summary?.gross_revenue_inr
                    )}
                  </p>
                  <p className="text-[10px] text-[#50575e] mt-0.5">
                    {currencyMode === 'USD'
                      ? `₹${(reportData.summary?.gross_revenue_inr || 0).toLocaleString('en-IN')}`
                      : `$${(reportData.summary?.gross_revenue_usd || 0).toFixed(2)} USD`}
                  </p>
                </div>

                {/* Procurement COGS */}
                <div className="bg-white border border-[#c3c4c7] p-3 shadow-xs rounded-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-[#50575e] uppercase">Procurement (COGS)</span>
                    <ShoppingBag className="w-3.5 h-3.5 text-[#d63638]" />
                  </div>
                  <p className="text-[17px] font-extrabold text-[#d63638]">
                    {formatMoney(
                      reportData.summary?.total_cogs_usd,
                      reportData.summary?.total_cogs_inr
                    )}
                  </p>
                  <p className="text-[10px] text-[#50575e] mt-0.5">
                    {currencyMode === 'USD'
                      ? `₹${(reportData.summary?.total_cogs_inr || 0).toLocaleString('en-IN')}`
                      : `$${(reportData.summary?.total_cogs_usd || 0).toFixed(2)} USD`}
                  </p>
                </div>

                {/* Shipping & Freight */}
                <div className="bg-white border border-[#c3c4c7] p-3 shadow-xs rounded-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-[#50575e] uppercase">Shipping & Labels</span>
                    <Truck className="w-3.5 h-3.5 text-[#dba617]" />
                  </div>
                  <p className="text-[17px] font-extrabold text-[#1d2327]">
                    {formatMoney(
                      reportData.summary?.total_shipping_usd,
                      reportData.summary?.total_shipping_inr
                    )}
                  </p>
                  <p className="text-[10px] text-[#50575e] mt-0.5">Freight & label costs</p>
                </div>

                {/* Gross Profit & Margin */}
                <div className="bg-white border border-[#c3c4c7] p-3 shadow-xs rounded-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-[#50575e] uppercase">Gross Profit</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded-xs ${
                        (reportData.summary?.gross_profit_usd || 0) >= 0
                          ? 'bg-[#edfaef] text-[#00a32a] border border-[#00a32a]/30'
                          : 'bg-[#fcf0f1] text-[#d63638] border border-[#d63638]/30'
                      }`}
                    >
                      {reportData.summary?.gross_margin_pct || 0}%
                    </span>
                  </div>
                  <p
                    className={`text-[17px] font-extrabold ${
                      (reportData.summary?.gross_profit_usd || 0) >= 0
                        ? 'text-[#00a32a]'
                        : 'text-[#d63638]'
                    }`}
                  >
                    {formatMoney(
                      reportData.summary?.gross_profit_usd,
                      reportData.summary?.gross_profit_inr
                    )}
                  </p>
                  <p className="text-[10px] text-[#50575e] mt-0.5">Contribution Margin</p>
                </div>

                {/* Partner Profit Cut */}
                <div className="bg-white border border-[#c3c4c7] p-3 shadow-xs rounded-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-[#50575e] uppercase">
                      Partner Cut ({reportData.summary?.partner_share_pct || 0}%)
                    </span>
                    <Users className="w-3.5 h-3.5 text-[#2271b1]" />
                  </div>
                  <p className="text-[17px] font-extrabold text-[#2271b1]">
                    {formatMoney(
                      reportData.summary?.partner_share_usd,
                      reportData.summary?.partner_share_inr
                    )}
                  </p>
                  <p className="text-[10px] text-[#50575e] mt-0.5">Accrued Payout</p>
                </div>

                {/* Company Retained Profit */}
                <div className="bg-white border border-[#c3c4c7] p-3 shadow-xs rounded-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-[#50575e] uppercase">Company Net</span>
                    <Building2 className="w-3.5 h-3.5 text-[#1d2327]" />
                  </div>
                  <p className="text-[17px] font-extrabold text-[#1d2327]">
                    {formatMoney(
                      reportData.summary?.company_net_profit_usd,
                      reportData.summary?.company_net_profit_inr
                    )}
                  </p>
                  <p className="text-[10px] text-[#50575e] mt-0.5">Net Retained Profit</p>
                </div>
              </div>

              {/* ── Settlement & Cash Flow Status ── */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-white border border-[#c3c4c7] p-3 shadow-xs rounded-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-[#2271b1]" />
                    <span className="text-xs font-bold text-[#1d2327]">Partner Accrued Payout</span>
                  </div>
                  <p className="text-[18px] font-extrabold text-[#2271b1]">
                    {formatMoney(
                      reportData.summary?.partner_share_usd,
                      reportData.summary?.partner_share_inr
                    )}
                  </p>
                  <p className="text-[11px] text-[#50575e] mt-0.5">Earned from valid delivered orders</p>
                </div>

                <div className="bg-white border border-[#c3c4c7] p-3 shadow-xs rounded-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-[#00a32a]" />
                    <span className="text-xs font-bold text-[#1d2327]">Purchases Cleared (Paid)</span>
                  </div>
                  <p className="text-[18px] font-extrabold text-[#00a32a]">
                    {formatMoney(
                      reportData.summary?.paid_cogs_usd,
                      reportData.summary?.paid_cogs_inr
                    )}
                  </p>
                  <p className="text-[11px] text-[#50575e] mt-0.5">Procurement payments settled</p>
                </div>

                <div className="bg-white border border-[#c3c4c7] p-3 shadow-xs rounded-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-[#dba617]" />
                    <span className="text-xs font-bold text-[#1d2327]">Purchases Pending (Payable)</span>
                  </div>
                  <p className="text-[18px] font-extrabold text-[#dba617]">
                    {formatMoney(
                      reportData.summary?.pending_cogs_usd,
                      reportData.summary?.pending_cogs_inr
                    )}
                  </p>
                  <p className="text-[11px] text-[#50575e] mt-0.5">Accounts payable balance</p>
                </div>
              </div>

              {/* ── Transaction Ledger Table (Exact Same High-Density Style as Orders/Purchases) ── */}
              <div className="bg-white border border-[#c3c4c7] shadow-xs rounded-sm overflow-hidden">
                <div className="bg-[#f6f7f7] border-b border-[#c3c4c7] px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-[#2271b1]" />
                    <h2 className="text-xs font-bold text-[#1d2327] uppercase tracking-wide">
                      Transaction Ledger & Order Financials
                    </h2>
                    <span className="px-1.5 py-0.2 bg-white border border-[#c3c4c7] text-[#1d2327] rounded-xs text-[10px] font-bold">
                      {filteredLedger.length} Records
                    </span>
                  </div>

                  {/* Search in ledger */}
                  <div className="relative w-full sm:w-[240px]">
                    <Search className="w-3.5 h-3.5 text-[#50575e] absolute left-2.5 top-2" />
                    <input
                      type="text"
                      placeholder="Search order #, product, store..."
                      value={ledgerSearch}
                      onChange={(e) => setLedgerSearch(e.target.value)}
                      className="w-full bg-white border border-[#8c8f94] text-xs font-semibold pl-8 pr-2.5 py-1 rounded-xs focus:border-[#2271b1] outline-none"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
                  {filteredLedger.length > 0 ? (
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="sticky top-0 bg-[#f6f7f7] border-b border-[#c3c4c7] text-[#50575e] font-bold uppercase text-[11px] z-10">
                        <tr>
                          <th className="px-3 py-2 border-r border-[#c3c4c7]/40">Order #</th>
                          <th className="px-3 py-2 border-r border-[#c3c4c7]/40">Date</th>
                          <th className="px-3 py-2 border-r border-[#c3c4c7]/40">Store / Account</th>
                          <th className="px-3 py-2 border-r border-[#c3c4c7]/40">Product Name</th>
                          <th className="px-2 py-2 text-center border-r border-[#c3c4c7]/40">Qty</th>
                          <th className="px-3 py-2 text-right border-r border-[#c3c4c7]/40">Revenue</th>
                          <th className="px-3 py-2 text-right border-r border-[#c3c4c7]/40">COGS</th>
                          <th className="px-3 py-2 text-right border-r border-[#c3c4c7]/40">Shipping</th>
                          <th className="px-3 py-2 text-right border-r border-[#c3c4c7]/40">Gross Profit</th>
                          <th className="px-3 py-2 text-right border-r border-[#c3c4c7]/40 text-[#2271b1]">
                            Partner Cut
                          </th>
                          <th className="px-3 py-2 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#c3c4c7]/60 text-[12px]">
                        {filteredLedger.map((row: any) => {
                          const margin =
                            currencyMode === 'USD' ? row.gross_profit_usd : row.gross_profit_inr;
                          const cut =
                            currencyMode === 'USD' ? row.partner_cut_usd : row.partner_cut_inr;
                          return (
                            <tr key={row.order_id} className="hover:bg-[#f6f7f7]">
                              <td className="px-3 py-2 font-bold text-[#2271b1] border-r border-[#c3c4c7]/30 whitespace-nowrap">
                                {row.order_number}
                              </td>
                              <td className="px-3 py-2 text-[#50575e] border-r border-[#c3c4c7]/30 whitespace-nowrap">
                                {row.order_date || 'N/A'}
                              </td>
                              <td className="px-3 py-2 font-semibold text-[#2c3338] border-r border-[#c3c4c7]/30 whitespace-nowrap">
                                {row.account_name}
                              </td>
                              <td
                                className="px-3 py-2 text-[#2c3338] border-r border-[#c3c4c7]/30 max-w-[220px] truncate"
                                title={row.product_name}
                              >
                                {row.product_name}
                              </td>
                              <td className="px-2 py-2 text-center font-bold text-[#2c3338] border-r border-[#c3c4c7]/30">
                                {row.qty}
                              </td>
                              <td className="px-3 py-2 text-right font-bold text-[#1d2327] border-r border-[#c3c4c7]/30 whitespace-nowrap">
                                {formatMoney(row.rev_usd, row.rev_inr)}
                              </td>
                              <td className="px-3 py-2 text-right font-medium text-[#d63638] border-r border-[#c3c4c7]/30 whitespace-nowrap">
                                {formatMoney(row.cogs_usd, row.cogs_inr)}
                              </td>
                              <td className="px-3 py-2 text-right font-medium text-[#dba617] border-r border-[#c3c4c7]/30 whitespace-nowrap">
                                {formatMoney(row.shipping_cost_usd, row.shipping_cost_inr)}
                              </td>
                              <td
                                className={`px-3 py-2 text-right font-bold border-r border-[#c3c4c7]/30 whitespace-nowrap ${
                                  margin >= 0 ? 'text-[#00a32a]' : 'text-[#d63638]'
                                }`}
                              >
                                {margin >= 0 ? '+' : ''}
                                {formatMoney(row.gross_profit_usd, row.gross_profit_inr)}
                              </td>
                              <td className="px-3 py-2 text-right font-extrabold text-[#2271b1] border-r border-[#c3c4c7]/30 whitespace-nowrap">
                                {formatMoney(row.partner_cut_usd, row.partner_cut_inr)}
                              </td>
                              <td className="px-3 py-2 text-center whitespace-nowrap">
                                <span className="px-2 py-0.5 rounded-xs text-[10px] font-bold border border-[#c3c4c7] bg-white">
                                  {row.order_status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="py-12 text-center text-[#50575e]">
                      <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#50575e]" />
                      <p className="text-xs font-semibold">No order transaction records found</p>
                      <p className="text-[11px] text-[#50575e] mt-0.5">
                        Try adjusting your Company, Partner, or Date Range filters
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-[#c3c4c7] p-10 text-center text-[#50575e] rounded-sm shadow-xs">
              <Store className="w-8 h-8 mx-auto mb-2 text-[#a7aaad]" />
              <h3 className="text-sm font-bold text-[#1d2327]">Select a Company or Partner</h3>
              <p className="text-xs text-[#50575e] max-w-md mx-auto mt-1">
                Select from the dropdowns above to generate financial settlement statements and download the CSV report.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
