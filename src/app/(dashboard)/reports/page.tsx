'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { getToken } from '@/lib/auth';
import { getMonthlyReport } from '@/lib/api';
import type { MonthlyReport } from '@/types';
import { TrendingUp, TrendingDown, IndianRupee, Wallet, Plus, Calendar } from 'lucide-react';
import clsx from 'clsx';

type PeriodType = 'daily' | 'monthly' | 'yearly';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function currentMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function currentYearStr() {
  return String(new Date().getFullYear());
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<PeriodType>('monthly');
  const [dayValue, setDayValue] = useState(todayStr());
  const [monthValue, setMonthValue] = useState(currentMonthStr());
  const [yearValue, setYearValue] = useState(currentYearStr());

  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState(true);

  const token = getToken() ?? '';
  const activeValue = period === 'daily' ? dayValue : period === 'yearly' ? yearValue : monthValue;

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMonthlyReport(token, activeValue, period);
      setReport(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [token, activeValue, period]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const isProfit = (report?.netProfit ?? 0) >= 0;
  const years = Array.from({ length: 6 }, (_, i) => String(new Date().getFullYear() - i));

  const periodTitle =
    period === 'daily' ? 'Daily Tally' : period === 'yearly' ? 'Yearly Tally' : 'Monthly Tally';

  return (
    <div className="p-6 max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reports &amp; Tally ({periodTitle})</h1>
          <p className="text-sm text-slate-500 mt-1">
            Tally all Orders &amp; Expenses — Total Sales − Total Expenses = Net Profit / Loss
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Daily / Monthly / Yearly Switcher */}
          <div className="inline-flex bg-slate-100 p-1 rounded-xl">
            {([
              { id: 'daily', label: 'Daily' },
              { id: 'monthly', label: 'This Month' },
              { id: 'yearly', label: 'Yearly' },
            ] as { id: PeriodType; label: string }[]).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriod(p.id)}
                className={clsx(
                  'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition',
                  period === p.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Dynamic Date / Month / Year Picker */}
          <div className="relative flex items-center">
            <Calendar size={14} className="absolute left-3 text-slate-400 pointer-events-none" />
            {period === 'daily' && (
              <input
                type="date"
                value={dayValue}
                onChange={(e) => setDayValue(e.target.value || todayStr())}
                className="pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            )}
            {period === 'monthly' && (
              <input
                type="month"
                value={monthValue}
                onChange={(e) => setMonthValue(e.target.value || currentMonthStr())}
                className="pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            )}
            {period === 'yearly' && (
              <select
                value={yearValue}
                onChange={(e) => setYearValue(e.target.value)}
                className="pl-8 pr-4 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            )}
          </div>

          <Link
            href="/expenses"
            className="flex items-center gap-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
          >
            <Plus size={14} />
            Add Expense
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
        </div>
      ) : (
        <>
          {/* 3 KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 uppercase">Total Sales</span>
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                  <IndianRupee size={18} />
                </div>
              </div>
              <div className="text-3xl font-bold text-slate-900">
                ₹{(report?.totalSales ?? 0).toFixed(2)}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                From {report?.orderCount ?? 0} orders ({report?.month})
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 uppercase">Total Expenses</span>
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Wallet size={18} />
                </div>
              </div>
              <div className="text-3xl font-bold text-rose-600">
                ₹{(report?.totalExpenses ?? 0).toFixed(2)}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                From {report?.expenseCount ?? 0} expense entries ({report?.month})
              </div>
            </div>

            <div
              className={clsx(
                'rounded-2xl p-6 border shadow-sm',
                isProfit ? 'bg-emerald-50/70 border-emerald-200' : 'bg-rose-50/70 border-rose-200'
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-600 uppercase">
                  Net {isProfit ? 'Profit' : 'Loss'}
                </span>
                <div
                  className={clsx(
                    'w-10 h-10 rounded-xl flex items-center justify-center',
                    isProfit ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                  )}
                >
                  {isProfit ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                </div>
              </div>
              <div
                className={clsx('text-3xl font-bold', isProfit ? 'text-emerald-700' : 'text-rose-700')}
              >
                {isProfit ? '+' : '-'}₹{Math.abs(report?.netProfit ?? 0).toFixed(2)}
              </div>
              <div className="text-xs text-slate-500 mt-1">Period: {report?.month}</div>
            </div>
          </div>

          {/* Two-column Tally Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Orders Tally */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-800">Orders ({report?.orderCount ?? 0})</h2>
                <span className="text-xs font-semibold text-teal-600">
                  ₹{(report?.totalSales ?? 0).toFixed(2)}
                </span>
              </div>
              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {(report?.orders ?? []).length === 0 ? (
                  <div className="px-5 py-8 text-center text-xs text-slate-400">
                    No orders recorded for this period.
                  </div>
                ) : (
                  report?.orders.map((o) => (
                    <div key={o.id} className="px-5 py-3 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-slate-800">
                          {o.orderNumber} · {o.tableNumber ? `Table #${o.tableNumber}` : 'Take Away'}
                        </div>
                        <div className="text-slate-400">
                          {new Date(o.createdAt).toLocaleDateString('en-IN')} · {o.status}
                        </div>
                      </div>
                      <div className="font-bold text-slate-900">₹{Number(o.total || 0).toFixed(2)}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Expenses Tally */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-800">
                  Expenses ({report?.expenseCount ?? 0})
                </h2>
                <span className="text-xs font-semibold text-rose-600">
                  ₹{(report?.totalExpenses ?? 0).toFixed(2)}
                </span>
              </div>
              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {(report?.expenses ?? []).length === 0 ? (
                  <div className="px-5 py-8 text-center text-xs text-slate-400">
                    No expenses recorded for this period.
                  </div>
                ) : (
                  report?.expenses.map((ex) => (
                    <div key={ex.id} className="px-5 py-3 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-slate-800">{ex.description}</div>
                        <div className="text-slate-400">
                          {new Date(ex.date).toLocaleDateString('en-IN')} · {ex.category}
                        </div>
                      </div>
                      <div className="font-bold text-rose-600">-₹{Number(ex.amount || 0).toFixed(2)}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
