'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { getToken } from '@/lib/auth';
import { getOrders, deleteOrder } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { Pagination } from '@/components/Pagination';
import { ThermalReceiptModal, type ReceiptData } from '@/components/ThermalReceiptModal';
import { loadStoreSettings } from '@/lib/settings';
import type { Order } from '@/types';
import clsx from 'clsx';
import {
  Search,
  Calendar,
  Printer,
  Trash2,
  Globe,
  ShoppingBag,
  Zap,
  Monitor,
  Clock,
} from 'lucide-react';

const PAGE_SIZE = 10;

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getYesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function OrdersListPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());
  const [sourceFilter, setSourceFilter] = useState<'All' | 'Website' | 'POS'>('All');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  const token = getToken() ?? '';
  const toast = useToast();

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getOrders(token, undefined, selectedDate);
      setOrders(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [token, selectedDate, toast]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const isWebsiteOrder = (o: Order) => Boolean(o.sourceQueryNumber);

  const filtered = orders.filter((o) => {
    const matchSource =
      sourceFilter === 'All' ||
      (sourceFilter === 'Website' && isWebsiteOrder(o)) ||
      (sourceFilter === 'POS' && !isWebsiteOrder(o));

    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      (o.orderNumber || '').toLowerCase().includes(q) ||
      (o.customerName || '').toLowerCase().includes(q) ||
      (o.sourceQueryNumber || '').toLowerCase().includes(q) ||
      (o.items || []).some((it) => (it.dishName || '').toLowerCase().includes(q));

    return matchSource && matchSearch;
  });

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalRevenue = orders
    .filter((o) => o.paymentStatus !== 'Unpaid')
    .reduce((s, o) => s + Number(o.total || 0), 0);
  const websiteCount = orders.filter(isWebsiteOrder).length;
  const posCount = orders.length - websiteCount;

  async function handleDelete(o: Order) {
    if (!confirm(`Delete order ${o.orderNumber}?`)) return;
    try {
      await deleteOrder(token, o.id);
      setOrders((prev) => prev.filter((item) => item.id !== o.id));
      toast.success(`Deleted order ${o.orderNumber}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete order');
    }
  }

  function openBill(o: Order) {
    const settings = loadStoreSettings();
    setReceiptData({
      orderNumber: o.orderNumber,
      date: new Date(o.createdAt).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      orderType: o.orderType || (o.tableNumber ? 'Dine In' : 'Take Away'),
      tableNumber: o.tableNumber || undefined,
      customerName: o.customerName || 'Walk-in',
      paymentMethod: o.paymentMethod === 'Scan' ? 'UPI' : o.paymentMethod || 'Cash',
      items: (o.items || []).map((i) => ({
        name: i.dishName,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice || 0),
      })),
      subtotal: Number(o.subtotal || o.total || 0),
      taxRate: settings.taxRate,
      tax: Number(o.tax || 0),
      total: Number(o.total || 0),
    });
  }

  const today = getTodayStr();
  const yesterday = getYesterdayStr();

  return (
    <div className="p-4 sm:p-6 max-w-6xl space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#0D9488] flex items-center justify-center">
            <ShoppingBag size={20} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Orders</h1>
            <p className="text-xs sm:text-sm text-slate-500">
              All counter POS &amp; website orders with bill printing
            </p>
          </div>
        </div>
        <Link
          href="/pos"
          className="inline-flex items-center gap-2 bg-[#0D9488] hover:bg-[#0F766E] text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm"
        >
          <Zap size={16} />
          New POS Order
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <div className="text-2xl font-bold text-slate-800">{orders.length}</div>
          <div className="text-xs text-slate-500 mt-0.5">Total Orders</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <div className="text-2xl font-bold text-teal-600">₹{totalRevenue.toFixed(0)}</div>
          <div className="text-xs text-slate-500 mt-0.5">Paid Revenue</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <div className="text-2xl font-bold text-indigo-600">{websiteCount}</div>
          <div className="text-xs text-slate-500 mt-0.5">Website Orders</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <div className="text-2xl font-bold text-emerald-600">{posCount}</div>
          <div className="text-xs text-slate-500 mt-0.5">Counter POS Orders</div>
        </div>
      </div>

      {/* Date & Source Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search order #, customer, item..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex gap-1.5">
            {(['All', 'Website', 'POS'] as const).map((src) => (
              <button
                key={src}
                type="button"
                onClick={() => {
                  setSourceFilter(src);
                  setPage(1);
                }}
                className={clsx(
                  'px-3 py-1.5 rounded-xl text-xs font-semibold border transition inline-flex items-center gap-1',
                  sourceFilter === src
                    ? src === 'Website'
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-[#0D9488] text-white border-[#0D9488]'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                )}
              >
                {src === 'Website' && <Globe size={12} />}
                {src}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setSelectedDate(today);
              setPage(1);
            }}
            className={clsx(
              'px-3 py-1.5 rounded-xl text-xs font-semibold border transition',
              selectedDate === today
                ? 'bg-[#0D9488] text-white border-[#0D9488]'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            )}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedDate(yesterday);
              setPage(1);
            }}
            className={clsx(
              'px-3 py-1.5 rounded-xl text-xs font-semibold border transition',
              selectedDate === yesterday
                ? 'bg-[#0D9488] text-white border-[#0D9488]'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            )}
          >
            Yesterday
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedDate('all');
              setPage(1);
            }}
            className={clsx(
              'px-3 py-1.5 rounded-xl text-xs font-semibold border transition',
              selectedDate === 'all'
                ? 'bg-[#0D9488] text-white border-[#0D9488]'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            )}
          >
            All Dates
          </button>
          <div className="relative flex items-center">
            <Calendar size={13} className="absolute left-2.5 text-slate-400 pointer-events-none" />
            <input
              type="date"
              value={selectedDate === 'all' ? '' : selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value || 'all');
                setPage(1);
              }}
              className="pl-7 pr-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
          </div>
        ) : paginated.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400">
            No orders found for the selected filter.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {paginated.map((o) => {
              const fromWeb = isWebsiteOrder(o);
              return (
                <div key={o.id} className="p-4 sm:p-5 hover:bg-slate-50/60 transition space-y-2.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-extrabold text-slate-900">{o.orderNumber}</span>
                        {fromWeb ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                            <Globe size={11} />
                            Website {o.sourceQueryNumber}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            <Monitor size={11} />
                            POS
                          </span>
                        )}
                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700">
                          {o.orderType || (o.tableNumber ? `Table #${o.tableNumber}` : 'Take Away')}
                        </span>
                        <span
                          className={clsx(
                            'text-[11px] font-bold px-2.5 py-0.5 rounded-full',
                            o.paymentStatus === 'Unpaid'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-emerald-100 text-emerald-700'
                          )}
                        >
                          {o.paymentStatus === 'Unpaid'
                            ? 'Unpaid'
                            : `Paid · ${o.paymentMethod === 'Scan' ? 'UPI' : o.paymentMethod || 'Cash'}`}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                        <span className="font-semibold text-slate-700">{o.customerName || 'Walk-in'}</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock size={11} />
                          {new Date(o.createdAt).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-extrabold text-slate-900">
                        ₹{Number(o.total || 0).toFixed(2)}
                      </div>
                      <div className="text-[11px] text-slate-400">{o.status}</div>
                    </div>
                  </div>

                  {/* Items Summary */}
                  <div className="bg-slate-50 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 font-medium">
                    {(o.items || []).map((it) => `${it.quantity}x ${it.dishName}`).join(', ') || '—'}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => openBill(o)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal-200 text-teal-700 hover:bg-teal-50 text-xs font-semibold transition"
                    >
                      <Printer size={13} />
                      Bill
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(o)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition"
                      title="Delete order"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Pagination
          currentPage={page}
          totalItems={filtered.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      </div>

      <ThermalReceiptModal receipt={receiptData} onClose={() => setReceiptData(null)} />
    </div>
  );
}
