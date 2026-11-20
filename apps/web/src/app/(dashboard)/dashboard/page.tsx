'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { getToken } from '@/lib/auth';
import { getDashboardStats, getStocks, updateStock } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import type { DashboardStats, StockItem } from '@/types';
import {
  ShoppingBag,
  IndianRupee,
  Flame,
  Table2,
  Calendar,
  AlertTriangle,
  PackageX,
  Plus,
} from 'lucide-react';
import clsx from 'clsx';

function getTodayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getYesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={22} className="text-white" />
        </div>
      </div>
      <div className="text-3xl font-bold text-slate-800">{value}</div>
      <div className="text-sm font-medium text-slate-600 mt-1">{title}</div>
      {subtitle && <div className="text-xs text-slate-400 mt-0.5">{subtitle}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [lowStocks, setLowStocks] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [restockingId, setRestockingId] = useState<string | null>(null);
  const alertedRef = useRef(false);

  const toast = useToast();

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    Promise.all([getDashboardStats(token, selectedDate), getStocks(token).catch(() => [])])
      .then(([s, st]) => {
        setStats(s);
        const low = st.filter((item) => item.quantity <= item.minThreshold);
        setLowStocks(low);
        if (low.length > 0 && !alertedRef.current) {
          alertedRef.current = true;
          toast.error(
            `Low Stock Alert: ${low.length} item${low.length > 1 ? 's' : ''} need restocking!`
          );
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedDate, toast]);

  async function handleQuickRestock(item: StockItem) {
    const token = getToken();
    if (!token) return;
    setRestockingId(item.id);
    try {
      const updated = await updateStock(token, item.id, { quantity: item.quantity + 5 });
      setLowStocks((prev) =>
        prev
          .map((s) => (s.id === updated.id ? updated : s))
          .filter((s) => s.quantity <= s.minThreshold)
      );
      window.dispatchEvent(new Event('pos-stocks-updated'));
      toast.success(`Restocked ${updated.name} (+5 ${updated.unit})`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to restock');
    } finally {
      setRestockingId(null);
    }
  }

  const today = getTodayStr();
  const yesterday = getYesterdayStr();
  const dateLabel =
    selectedDate === 'all'
      ? 'All time'
      : selectedDate === today
      ? 'Today'
      : selectedDate === yesterday
      ? 'Yesterday'
      : new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Showing overview for <span className="font-semibold text-teal-700">{dateLabel}</span>
          </p>
        </div>

        {/* Date Filter Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedDate(today)}
            className={clsx(
              'px-3 py-2 rounded-xl text-xs font-semibold border transition',
              selectedDate === today
                ? 'bg-[#0D9488] text-white border-[#0D9488]'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            )}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setSelectedDate(yesterday)}
            className={clsx(
              'px-3 py-2 rounded-xl text-xs font-semibold border transition',
              selectedDate === yesterday
                ? 'bg-[#0D9488] text-white border-[#0D9488]'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            )}
          >
            Yesterday
          </button>
          <button
            type="button"
            onClick={() => setSelectedDate('all')}
            className={clsx(
              'px-3 py-2 rounded-xl text-xs font-semibold border transition',
              selectedDate === 'all'
                ? 'bg-[#0D9488] text-white border-[#0D9488]'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            )}
          >
            All Time
          </button>
          <div className="relative flex items-center">
            <Calendar size={14} className="absolute left-3 text-slate-400 pointer-events-none" />
            <input
              type="date"
              value={selectedDate === 'all' ? '' : selectedDate}
              onChange={(e) => setSelectedDate(e.target.value || 'all')}
              className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
        </div>
      ) : (
        <>
          {/* Top Low Stock Alert Banner */}
          {lowStocks.length > 0 && (
            <div className="mb-6 bg-rose-50 border border-rose-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <div className="text-sm font-bold text-rose-900">
                    Low Stock Alert: {lowStocks.length} item{lowStocks.length > 1 ? 's' : ''} running low!
                  </div>
                  <div className="text-xs text-rose-700">
                    {lowStocks
                      .slice(0, 4)
                      .map((s) => `${s.name} (${s.quantity} ${s.unit})`)
                      .join(', ')}
                    {lowStocks.length > 4 ? ` +${lowStocks.length - 4} more` : ''}
                  </div>
                </div>
              </div>
              <Link
                href="/stocks"
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition"
              >
                View All Stock
              </Link>
            </div>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard
              title="Total Orders"
              value={stats?.totalOrders ?? 0}
              subtitle={dateLabel}
              icon={ShoppingBag}
              color="bg-teal-600"
            />
            <StatCard
              title="Total Revenue"
              value={`₹${(stats?.totalRevenue ?? 0).toFixed(2)}`}
              subtitle={`Served orders (${dateLabel})`}
              icon={IndianRupee}
              color="bg-emerald-500"
            />
            <StatCard
              title="Active Orders"
              value={stats?.activeOrders ?? 0}
              subtitle="In kitchen & waiting"
              icon={Flame}
              color="bg-orange-500"
            />
            <StatCard
              title="Tables"
              value={`${stats?.occupiedTables ?? 0} / ${stats?.totalTables ?? 0}`}
              subtitle="Occupied / Total"
              icon={Table2}
              color="bg-violet-500"
            />
          </div>

          {/* Dedicated Low Stock Items Panel on Dashboard */}
          {lowStocks.length > 0 && (
            <div className="mt-6 bg-white rounded-2xl p-6 shadow-sm border border-amber-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={18} className="text-amber-600" />
                  <h2 className="text-base font-bold text-slate-800">
                    Items Needing Restock ({lowStocks.length})
                  </h2>
                </div>
                <Link
                  href="/stocks"
                  className="text-xs font-semibold text-[#0D9488] hover:underline"
                >
                  Open Stock Manager →
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {lowStocks.map((item) => {
                  const isOut = item.quantity <= 0;
                  return (
                    <div
                      key={item.id}
                      className={clsx(
                        'rounded-xl p-3.5 border flex items-center justify-between gap-3',
                        isOut
                          ? 'bg-rose-50/70 border-rose-200'
                          : 'bg-amber-50/70 border-amber-200'
                      )}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          {isOut && <PackageX size={13} className="text-rose-600 flex-shrink-0" />}
                          <span className="text-sm font-bold text-slate-800 truncate">
                            {item.name}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 mt-0.5">
                          Left: <span className="font-bold text-rose-700">{item.quantity} {item.unit}</span>{' '}
                          <span className="text-slate-400">(Alert ≤ {item.minThreshold})</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={restockingId === item.id}
                        onClick={() => handleQuickRestock(item)}
                        className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#0D9488] hover:bg-[#0F766E] disabled:bg-teal-300 text-white text-xs font-semibold transition"
                      >
                        <Plus size={12} />
                        5 {item.unit}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Status */}
          <div className="mt-6 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Quick Status ({dateLabel})</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'In Kitchen', color: 'bg-green-100 text-green-700', value: stats?.activeOrders ?? 0 },
                { label: 'Available Tables', color: 'bg-teal-100 text-teal-700', value: (stats?.totalTables ?? 0) - (stats?.occupiedTables ?? 0) },
                { label: 'Orders', color: 'bg-slate-100 text-slate-600', value: stats?.totalOrders ?? 0 },
                { label: 'Revenue', color: 'bg-amber-100 text-amber-700', value: `₹${(stats?.totalRevenue ?? 0).toFixed(2)}` },
              ].map((item) => (
                <div key={item.label} className={`rounded-xl px-4 py-3 ${item.color}`}>
                  <div className="text-xl font-bold">{item.value}</div>
                  <div className="text-xs font-medium mt-0.5">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
