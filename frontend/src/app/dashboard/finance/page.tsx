'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  IndianRupee,
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
  Shield,
  Calendar,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { financeApi, authApi } from '@/lib/api';

type Period = 'today' | 'week' | 'month' | 'year' | 'all';

export default function FinancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [period, setPeriod] = useState<Period>('all');
  const [summary, setSummary] = useState<any>(null);
  const [breakdown, setBreakdown] = useState<any>(null);
  const [activeExpenseTab, setActiveExpenseTab] = useState<'categories' | 'claims'>('categories');

  // Auth check — admin only
  useEffect(() => {
    authApi.getMe().then((res) => {
      if (res.data?.is_admin) {
        setAuthorized(true);
      } else {
        router.push('/dashboard');
      }
    }).catch(() => router.push('/dashboard'));
  }, [router]);

  // Fetch data when period changes
  useEffect(() => {
    if (!authorized) return;
    loadData();
  }, [period, authorized]);

  const loadData = async () => {
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

  const formatCurrency = (value: number) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
    return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatFullCurrency = (value: number) => {
    return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (!authorized) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center animate-pulse">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="text-[13px] text-slate-500 font-medium">Verifying access...</span>
        </div>
      </div>
    );
  }

  if (loading && !summary) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="text-[13px] text-slate-500 font-medium">Loading financial data...</span>
        </div>
      </div>
    );
  }

  const profitIsPositive = (summary?.profit?.net_profit || 0) >= 0;
  const maxMonthlyValue = Math.max(
    ...(breakdown?.monthly_trends || []).map((m: any) => Math.max(m.revenue, m.expenses)),
    1
  );

  const totalExpenses = summary?.expenses?.total_expenses || 0;

  return (
    <div className="space-y-6 pb-8">
      {/* ═══ Header ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <IndianRupee className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-[22px] font-bold text-slate-800 tracking-tight">Finance Overview</h1>
              <p className="text-[12px] text-slate-400 font-medium mt-0.5">Money flow & profit analysis · Admin only</p>
            </div>
          </div>
        </div>

        {/* Period Filter */}
        <div className="flex items-center gap-1 bg-white rounded-xl p-1 shadow-sm border border-slate-200/80">
          {(['today', 'week', 'month', 'year', 'all'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                period === p
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-sm shadow-blue-500/25'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              {p === 'all' ? 'All Time' : p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : p === 'year' ? 'This Year' : 'Today'}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ Summary Cards ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-50 to-transparent rounded-bl-full opacity-80" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-sm shadow-emerald-500/20">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                {summary?.revenue?.orders_count || 0} orders
              </span>
            </div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Revenue</p>
            <p className="text-[24px] font-extrabold text-slate-800 tracking-tight">{formatCurrency(summary?.revenue?.total_revenue || 0)}</p>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">Commission: {formatCurrency(summary?.revenue?.total_commission || 0)}</p>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-red-50 to-transparent rounded-bl-full opacity-80" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center shadow-sm shadow-red-500/20">
                <TrendingDown className="w-5 h-5 text-white" />
              </div>
              <span className="text-[11px] font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
                {(summary?.expenses?.purchases_count || 0) + (summary?.expenses?.shipments_count || 0)} items
              </span>
            </div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Expenses</p>
            <p className="text-[24px] font-extrabold text-slate-800 tracking-tight">{formatCurrency(totalExpenses)}</p>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">
              Salaries: {formatCurrency(summary?.expenses?.total_salaries || 0)} · Claims: {formatCurrency(summary?.expenses?.total_expense_claims || 0)}
            </p>
          </div>
        </div>

        {/* Net Profit */}
        <div className={`relative overflow-hidden bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition-shadow group ${
          profitIsPositive ? 'border-emerald-200/80' : 'border-red-200/80'
        }`}>
          <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl rounded-bl-full opacity-80 ${
            profitIsPositive ? 'from-emerald-50' : 'from-red-50'
          } to-transparent`} />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-sm ${
                profitIsPositive
                  ? 'from-emerald-500 to-teal-600 shadow-emerald-500/20'
                  : 'from-red-500 to-rose-600 shadow-red-500/20'
              }`}>
                <IndianRupee className="w-5 h-5 text-white" />
              </div>
              {profitIsPositive ? (
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                  <ArrowUpRight className="w-3 h-3" /> Profit
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
                  <ArrowDownRight className="w-3 h-3" /> Loss
                </span>
              )}
            </div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Net Profit / Loss</p>
            <p className={`text-[24px] font-extrabold tracking-tight ${profitIsPositive ? 'text-emerald-700' : 'text-red-600'}`}>
              {profitIsPositive ? '+' : ''}{formatCurrency(summary?.profit?.net_profit || 0)}
            </p>
          </div>
        </div>

        {/* Profit Margin */}
        <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-50 to-transparent rounded-bl-full opacity-80" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm shadow-blue-500/20">
                <PieChart className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Profit Margin</p>
            <p className={`text-[24px] font-extrabold tracking-tight ${
              (summary?.profit?.profit_margin || 0) >= 0 ? 'text-slate-800' : 'text-red-600'
            }`}>
              {summary?.profit?.profit_margin || 0}%
            </p>
            {/* Progress bar */}
            <div className="mt-3 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  (summary?.profit?.profit_margin || 0) >= 30
                    ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                    : (summary?.profit?.profit_margin || 0) >= 10
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                    : 'bg-gradient-to-r from-red-400 to-red-500'
                }`}
                style={{ width: `${Math.min(Math.max(summary?.profit?.profit_margin || 0, 0), 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Monthly Trends Chart ═══ */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-[14px] font-bold text-slate-700">Monthly Revenue vs Expenses</h2>
              <p className="text-[11px] text-slate-400 font-medium">Last 12 months trend</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-gradient-to-r from-emerald-400 to-emerald-500" />
              <span className="text-[11px] text-slate-500 font-medium">Revenue</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-gradient-to-r from-red-400 to-red-500" />
              <span className="text-[11px] text-slate-500 font-medium">Expenses</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-gradient-to-r from-blue-400 to-blue-500" />
              <span className="text-[11px] text-slate-500 font-medium">Profit</span>
            </div>
          </div>
        </div>
        <div className="p-6">
          {breakdown?.monthly_trends && breakdown.monthly_trends.length > 0 ? (
            <div className="flex items-end gap-2 h-[240px]">
              {breakdown.monthly_trends.map((month: any, idx: number) => {
                const revenueHeight = maxMonthlyValue > 0 ? (month.revenue / maxMonthlyValue) * 200 : 0;
                const expenseHeight = maxMonthlyValue > 0 ? (month.expenses / maxMonthlyValue) * 200 : 0;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-10">
                      <div className="bg-slate-800 text-white rounded-lg px-3 py-2 text-[11px] whitespace-nowrap shadow-lg">
                        <p className="font-bold mb-1">{month.month}</p>
                        <p className="text-emerald-300">Revenue: {formatFullCurrency(month.revenue)}</p>
                        <p className="text-red-300">Expenses: {formatFullCurrency(month.expenses)}</p>
                        <p className={month.profit >= 0 ? 'text-blue-300' : 'text-red-300'}>
                          Profit: {formatFullCurrency(month.profit)}
                        </p>
                      </div>
                      <div className="w-2 h-2 bg-slate-800 rotate-45 -mt-1" />
                    </div>
                    <div className="flex items-end gap-0.5 w-full">
                      {/* Revenue bar */}
                      <div
                        className="flex-1 bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-md transition-all duration-500 hover:opacity-90 min-h-[2px]"
                        style={{ height: `${Math.max(revenueHeight, 2)}px` }}
                      />
                      {/* Expense bar */}
                      <div
                        className="flex-1 bg-gradient-to-t from-red-500 to-red-400 rounded-t-md transition-all duration-500 hover:opacity-90 min-h-[2px]"
                        style={{ height: `${Math.max(expenseHeight, 2)}px` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium mt-1">{month.month_short}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-slate-400 text-[13px]">
              <div className="text-center">
                <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p>No trend data available</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ Revenue by Account + Expense Breakdown ═══ */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Revenue by Account */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-[14px] font-bold text-slate-700">Revenue by Marketplace</h2>
              <p className="text-[11px] text-slate-400 font-medium">Earnings per account</p>
            </div>
          </div>
          <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
            {breakdown?.revenue_by_account && breakdown.revenue_by_account.length > 0 ? (
              breakdown.revenue_by_account.map((acc: any, idx: number) => {
                const maxRev = breakdown.revenue_by_account[0]?.revenue || 1;
                const pct = (acc.revenue / maxRev) * 100;
                const colors = [
                  'from-emerald-400 to-emerald-500',
                  'from-blue-400 to-blue-500',
                  'from-violet-400 to-violet-500',
                  'from-amber-400 to-amber-500',
                  'from-cyan-400 to-cyan-500',
                  'from-pink-400 to-pink-500',
                ];
                return (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 hover:border-slate-200 transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${colors[idx % colors.length]}`} />
                        <span className="text-[13px] font-semibold text-slate-700">{acc.account}</span>
                      </div>
                      <span className="text-[12px] font-bold text-emerald-600">{formatCurrency(acc.revenue)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-slate-200/60 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${colors[idx % colors.length]} transition-all duration-700`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium w-16 text-right">{acc.orders} orders</span>
                    </div>
                    {acc.commission > 0 && (
                      <p className="text-[10px] text-slate-400 mt-1 ml-4">Commission: {formatCurrency(acc.commission)}</p>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-slate-400 text-[13px]">
                <ShoppingCart className="w-6 h-6 mx-auto mb-2 opacity-40" />
                <p>No revenue data</p>
              </div>
            )}
          </div>
        </div>

        {/* Expense Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
                <PieChart className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-[14px] font-bold text-slate-700">Expense Breakdown</h2>
                <p className="text-[11px] text-slate-400 font-medium">Where money is spent</p>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
              <button
                onClick={() => setActiveExpenseTab('categories')}
                className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  activeExpenseTab === 'categories' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400'
                }`}
              >
                Categories
              </button>
              <button
                onClick={() => setActiveExpenseTab('claims')}
                className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  activeExpenseTab === 'claims' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400'
                }`}
              >
                Claims
              </button>
            </div>
          </div>
          <div className="p-4 space-y-3">
            {activeExpenseTab === 'categories' ? (
              <>
                {breakdown?.expense_categories?.map((cat: any, idx: number) => {
                  const pct = totalExpenses > 0 ? (cat.amount / totalExpenses) * 100 : 0;
                  const icons = [ShoppingBag, Truck, Users, Receipt];
                  const Icon = icons[idx] || Receipt;
                  return (
                    <div key={idx} className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 hover:border-slate-200 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `${cat.color}15` }}
                          >
                            <Icon className="w-4 h-4" style={{ color: cat.color }} />
                          </div>
                          <div>
                            <span className="text-[13px] font-semibold text-slate-700">{cat.category}</span>
                            <p className="text-[10px] text-slate-400">{cat.count} items</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[13px] font-bold text-slate-700">{formatCurrency(cat.amount)}</span>
                          <p className="text-[10px] text-slate-400">{pct.toFixed(1)}%</p>
                        </div>
                      </div>
                      <div className="w-full bg-slate-200/60 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, backgroundColor: cat.color }}
                        />
                      </div>
                    </div>
                  );
                })}
                {(!breakdown?.expense_categories || breakdown.expense_categories.length === 0) && (
                  <div className="py-8 text-center text-slate-400 text-[13px]">
                    <PieChart className="w-6 h-6 mx-auto mb-2 opacity-40" />
                    <p>No expense data</p>
                  </div>
                )}
              </>
            ) : (
              <>
                {breakdown?.claims_by_category && breakdown.claims_by_category.length > 0 ? (
                  breakdown.claims_by_category.map((claim: any, idx: number) => {
                    const maxAmount = breakdown.claims_by_category[0]?.amount || 1;
                    const pct = (claim.amount / maxAmount) * 100;
                    return (
                      <div key={idx} className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[13px] font-semibold text-slate-700">{claim.category}</span>
                          <span className="text-[12px] font-bold text-cyan-600">{formatCurrency(claim.amount)}</span>
                        </div>
                        <div className="w-full bg-slate-200/60 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-cyan-500 transition-all duration-700"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-slate-400 text-[13px]">
                    <Receipt className="w-6 h-6 mx-auto mb-2 opacity-40" />
                    <p>No approved claims data</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ═══ Detailed Financial Breakdown Cards ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Purchases Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Purchases</p>
              <p className="text-[18px] font-extrabold text-slate-800">{formatCurrency(summary?.expenses?.total_purchases || 0)}</p>
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <span className="text-[11px] text-slate-400 font-medium">Total Items</span>
            <span className="text-[12px] font-bold text-slate-600">{summary?.expenses?.purchases_count || 0}</span>
          </div>
        </div>

        {/* Shipments Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center">
              <Truck className="w-4 h-4 text-orange-500" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Shipping</p>
              <p className="text-[18px] font-extrabold text-slate-800">{formatCurrency(summary?.expenses?.total_shipment_cost || 0)}</p>
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <span className="text-[11px] text-slate-400 font-medium">Total Shipments</span>
            <span className="text-[12px] font-bold text-slate-600">{summary?.expenses?.shipments_count || 0}</span>
          </div>
        </div>

        {/* Salaries Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
              <Users className="w-4 h-4 text-violet-500" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Salaries</p>
              <p className="text-[18px] font-extrabold text-slate-800">{formatCurrency(summary?.expenses?.total_salaries || 0)}</p>
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <span className="text-[11px] text-slate-400 font-medium">Active Employees</span>
            <span className="text-[12px] font-bold text-slate-600">{summary?.expenses?.employees_paid || 0}</span>
          </div>
        </div>

        {/* Expense Claims Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-cyan-50 flex items-center justify-center">
              <Receipt className="w-4 h-4 text-cyan-500" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Exp. Claims</p>
              <p className="text-[18px] font-extrabold text-slate-800">{formatCurrency(summary?.expenses?.total_expense_claims || 0)}</p>
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <span className="text-[11px] text-slate-400 font-medium">Approved Claims</span>
            <span className="text-[12px] font-bold text-slate-600">{summary?.expenses?.claims_count || 0}</span>
          </div>
        </div>
      </div>

      {/* ═══ Top Products by Revenue ═══ */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <Package className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-[14px] font-bold text-slate-700">Top Products by Revenue</h2>
            <p className="text-[11px] text-slate-400 font-medium">Best performing products</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          {breakdown?.top_products && breakdown.top_products.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/80">
                  <th className="text-left px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">#</th>
                  <th className="text-left px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Product Name</th>
                  <th className="text-right px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Qty Sold</th>
                  <th className="text-right px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.top_products.map((product: any, idx: number) => (
                  <tr key={idx} className="border-t border-slate-50 hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-[11px] font-bold ${
                        idx === 0 ? 'bg-amber-100 text-amber-700' :
                        idx === 1 ? 'bg-slate-100 text-slate-600' :
                        idx === 2 ? 'bg-orange-50 text-orange-600' :
                        'bg-slate-50 text-slate-400'
                      }`}>
                        {idx + 1}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-[13px] font-medium text-slate-700 max-w-[300px] truncate">{product.product}</td>
                    <td className="px-6 py-3 text-right text-[13px] font-semibold text-slate-500">{product.qty_sold}</td>
                    <td className="px-6 py-3 text-right text-[13px] font-bold text-emerald-600">{formatCurrency(product.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-8 text-center text-slate-400 text-[13px]">
              <Package className="w-6 h-6 mx-auto mb-2 opacity-40" />
              <p>No product data available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
