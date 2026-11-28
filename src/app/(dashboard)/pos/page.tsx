'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { getToken } from '@/lib/auth';
import { useToast } from '@/components/ToastProvider';
import { getDishes, getTables, getOrders, createOrder, updateOrder, deleteOrder, getOrderQueries, convertOrderQuery, deleteOrderQuery } from '@/lib/api';
import { loadStoreSettings, type StoreType } from '@/lib/settings';
import { ThermalReceiptModal, type ReceiptData } from '@/components/ThermalReceiptModal';
import type { Dish, Table, Order, OrderItem, OrderQuery } from '@/types';
import clsx from 'clsx';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Banknote,
  CreditCard,
  Smartphone,
  Printer,
  CheckCircle2,
  Zap,
  ShoppingBag,
  Utensils,
  Calendar,
  X,
  ArrowRight,
  Clock,
  Globe,
} from 'lucide-react';

type CartItem = { dish: Dish; quantity: number };
type PayMethod = 'Cash' | 'Scan' | 'Card';
type OrderMode = 'Take Away' | 'Dine In';

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function QuickPOSPage() {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());
  const [dayOrders, setDayOrders] = useState<Order[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [cart, setCart] = useState<CartItem[]>([]);

  const [orderMode, setOrderMode] = useState<OrderMode>('Take Away');
  const [selectedTableId, setSelectedTableId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [payMethod, setPayMethod] = useState<PayMethod>('Cash');
  const [cashReceived, setCashReceived] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Rush-hour compact checkout pop-up on mobile
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [heldOpen, setHeldOpen] = useState(false);
  const [orderQueries, setOrderQueries] = useState<OrderQuery[]>([]);
  const [queriesOpen, setQueriesOpen] = useState(false);
  const [convertingQueryId, setConvertingQueryId] = useState<string | null>(null);
  const [holdPaymentStatus, setHoldPaymentStatus] = useState<'Unpaid' | 'Paid'>('Unpaid');
  const [pickupOffset, setPickupOffset] = useState<string>('+30 min');
  // Thermal receipt modal
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [taxRate, setTaxRate] = useState(5);
  const [storeType, setStoreType] = useState<StoreType>('big');

  const token = getToken() ?? '';
  const toast = useToast();

  useEffect(() => {
    const sync = () => {
      const s = loadStoreSettings();
      setTaxRate(s.taxRate);
      setStoreType(s.storeType);
      if (s.storeType === 'small') setOrderMode('Take Away');
    };
    sync();
    window.addEventListener('pos-settings-updated', sync);
    return () => window.removeEventListener('pos-settings-updated', sync);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [d, t, o, q] = await Promise.all([
        getDishes(token),
        getTables(token),
        getOrders(token, undefined, selectedDate),
        getOrderQueries(token, 'Pending').catch(() => []),
      ]);
      setDishes(d.filter((item) => item.available !== false));
      setTables(t);
      setDayOrders(o);
      setOrderQueries(q);
      if (t.length > 0 && !selectedTableId) setSelectedTableId(t[0].id);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [token, selectedTableId, selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-poll pending external order queries every 20s so new website queries appear live
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      getOrderQueries(token, 'Pending')
        .then(setOrderQueries)
        .catch(() => {});
    }, 20000);
    return () => clearInterval(interval);
  }, [token]);

  const categories = ['All', ...Array.from(new Set(dishes.map((d) => d.category).filter(Boolean)))];

  const filteredDishes = dishes.filter((d) => {
    const matchCat = category === 'All' || d.category === category;
    const matchSearch = (d.name || '').toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  function addItem(dish: Dish) {
    setCart((prev) => {
      const existing = prev.find((c) => c.dish.id === dish.id);
      if (existing) {
        return prev.map((c) => (c.dish.id === dish.id ? { ...c, quantity: c.quantity + 1 } : c));
      }
      return [...prev, { dish, quantity: 1 }];
    });
  }

  function updateQty(dishId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((c) => (c.dish.id === dishId ? { ...c, quantity: c.quantity + delta } : c))
        .filter((c) => c.quantity > 0)
    );
  }

  function getQty(dishId: string) {
    return cart.find((c) => c.dish.id === dishId)?.quantity ?? 0;
  }

  const subtotal = cart.reduce((s, c) => s + Number(c.dish.price || 0) * c.quantity, 0);
  const tax = parseFloat(((subtotal * taxRate) / 100).toFixed(2));
  const total = parseFloat((subtotal + tax).toFixed(2));
  const totalItems = cart.reduce((s, c) => s + c.quantity, 0);

  const cashNum = Number(cashReceived) || 0;
  const changeDue = payMethod === 'Cash' && cashNum > 0 ? Math.max(0, cashNum - total) : 0;

  const selectedTable = tables.find((t) => t.id === selectedTableId);
  const heldOrders = dayOrders.filter((o) => o.status === 'Hold');

  function openBillPreview(orderNumber = `#F${String(dayOrders.length + 27).padStart(4, '0')}`) {
    if (cart.length === 0) return;
    setReceiptData({
      orderNumber,
      date: new Date().toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      orderType: orderMode,
      tableNumber: orderMode === 'Dine In' ? selectedTable?.number : undefined,
      customerName: customerName.trim() || 'Walk-in',
      paymentMethod: payMethod === 'Scan' ? 'UPI' : payMethod,
      items: cart.map((c) => ({
        name: c.dish.name,
        quantity: c.quantity,
        unitPrice: Number(c.dish.price || 0),
      })),
      subtotal,
      taxRate,
      tax,
      total,
    });
  }

  async function handleCheckout(instantComplete: boolean, openReceiptAfter = false) {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      const items: OrderItem[] = cart.map((c) => ({
        dishId: c.dish.id,
        dishName: c.dish.name,
        quantity: c.quantity,
        unitPrice: Number(c.dish.price || 0),
      }));

      const created = await createOrder(token, {
        tableId: orderMode === 'Dine In' ? selectedTableId : 'takeaway',
        orderType: orderMode,
        customerName: customerName.trim() || 'Walk-in',
        items,
        paymentMethod: payMethod,
        status: instantComplete ? 'Served' : 'InKitchen',
      });

      if (openReceiptAfter) {
        openBillPreview(created.orderNumber);
      }

      setCart([]);
      setCashReceived('');
      setCustomerName('');
      setCheckoutOpen(false);
      await loadData();
      toast.success(
        `Order ${created.orderNumber} (${orderMode}) — ₹${created.total.toFixed(2)} ${
          instantComplete ? 'Completed!' : 'Sent to Kitchen!'
        }`
      );
    } catch (e) {
      console.error(e);
      toast.error('Failed to place order');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleHoldOrder() {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      const items: OrderItem[] = cart.map((c) => ({
        dishId: c.dish.id,
        dishName: c.dish.name,
        quantity: c.quantity,
        unitPrice: Number(c.dish.price || 0),
      }));
      const created = await createOrder(token, {
        tableId: orderMode === 'Dine In' ? selectedTableId : 'takeaway',
        orderType: orderMode,
        customerName: customerName.trim() || 'Walk-in',
        items,
        paymentMethod: holdPaymentStatus === 'Paid' ? payMethod : undefined,
        status: 'Hold',
        paymentStatus: holdPaymentStatus,
        pickupTime: pickupOffset,
      });
      setCart([]);
      setCustomerName('');
      setCheckoutOpen(false);
      await loadData();
      toast.success(`Held ${created.orderNumber} (${holdPaymentStatus}) for pickup ${pickupOffset}`);
    } catch {
      toast.error('Failed to hold order');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCompleteHeld(order: Order, method?: PayMethod) {
    try {
      await updateOrder(token, order.id, {
        status: 'Served',
        paymentStatus: 'Paid',
        paymentMethod: method ?? order.paymentMethod ?? 'Cash',
      });
      await loadData();
      toast.success(`Order ${order.orderNumber} completed!`);
    } catch {
      toast.error('Failed to complete order');
    }
  }

  async function handleConvertQuery(q: OrderQuery, method: PayMethod) {
    setConvertingQueryId(q.id);
    try {
      const res = await convertOrderQuery(token, q.id, method, 'Served');
      await loadData();
      toast.success(`Converted ${q.queryNumber} → Order ${res.order.orderNumber} (${method === 'Scan' ? 'UPI' : method})`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to convert query');
    } finally {
      setConvertingQueryId(null);
    }
  }

  async function handleDismissQuery(q: OrderQuery) {
    if (!confirm(`Delete order query ${q.queryNumber}?`)) return;
    try {
      await deleteOrderQuery(token, q.id);
      setOrderQueries((prev) => prev.filter((item) => item.id !== q.id));
      toast.success(`Dismissed ${q.queryNumber}`);
    } catch {
      toast.error('Failed to dismiss query');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-hidden bg-[#F7F9FA] relative">
      {/* ── Left: Rush-Hour Fast-Tap Menu ── */}
      <div className={clsx("flex-1 flex flex-col overflow-hidden p-3 sm:p-5 gap-3 sm:gap-4 lg:pb-5", cart.length > 0 ? "pb-20" : "pb-2")}>
        {/* Top Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#0D9488] text-white flex items-center justify-center">
              <Zap size={16} />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Quick Order POS
              </h1>
              <p className="text-[11px] text-slate-500">Tap item to add · adjust inline</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Link
              href="/orders"
              className="px-2.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 border border-teal-200 text-xs font-semibold text-teal-800 transition cursor-pointer"
              title="View all orders"
            >
              {dayOrders.length} Orders · ₹{dayOrders.filter((o) => o.paymentStatus !== 'Unpaid').reduce((s, o) => s + Number(o.total || 0), 0).toFixed(0)}
            </Link>
            <button
              type="button"
              onClick={() => setHeldOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800 hover:bg-amber-100 transition"
            >
              <Clock size={13} />
              Held ({heldOrders.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setQueriesOpen(true);
                getOrderQueries(token, 'Pending').then(setOrderQueries).catch(() => {});
              }}
              className={clsx(
                'relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition',
                orderQueries.length > 0
                  ? 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                  : 'bg-indigo-50 border-indigo-200 text-indigo-800 hover:bg-indigo-100'
              )}
            >
              <Globe size={13} />
              Queries ({orderQueries.length})
              {orderQueries.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping" />
              )}
            </button>
            <div className="relative flex items-center">
              <Calendar size={13} className="absolute left-2.5 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={selectedDate === 'all' ? '' : selectedDate}
                onChange={(e) => setSelectedDate(e.target.value || 'all')}
                className="pl-7 pr-2 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div className="relative flex-1 sm:w-52">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search item..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide flex-shrink-0 pb-0.5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={clsx(
                'flex-shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all border',
                category === cat
                  ? 'bg-[#0D9488] text-white border-[#0D9488] shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* One-Tap Dish Tiles with Inline - Qty + */}
        <div className="flex-1 overflow-y-auto pr-0.5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-3">
            {filteredDishes.map((dish) => {
              const qty = getQty(dish.id);
              return (
                <div
                  key={dish.id}
                  onClick={() => qty === 0 && addItem(dish)}
                  className={clsx(
                    'relative bg-white rounded-2xl p-3 border transition-all flex flex-col justify-between min-h-[116px] select-none',
                    qty > 0
                      ? 'border-[#0D9488] ring-2 ring-[#0D9488]/20 bg-[#F0FDFA]/50'
                      : 'border-slate-200/80 hover:border-teal-300 cursor-pointer active:scale-[0.98]'
                  )}
                >
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5 truncate">
                      {dish.category}
                    </div>
                    <div className="text-xs font-bold text-slate-800 leading-snug line-clamp-2">
                      {dish.name}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-1">
                    <span className="text-sm font-extrabold text-[#0D9488]">
                      ₹{Number(dish.price || 0).toFixed(0)}
                    </span>

                    {qty === 0 ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          addItem(dish);
                        }}
                        className="w-7 h-7 rounded-full bg-teal-50 text-[#0D9488] hover:bg-teal-100 flex items-center justify-center"
                        aria-label={`Add ${dish.name}`}
                      >
                        <Plus size={14} />
                      </button>
                    ) : (
                      <div
                        className="flex items-center gap-1.5 bg-white border border-teal-200 rounded-full px-1 py-0.5 shadow-xs"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => updateQty(dish.id, -1)}
                          className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700"
                          aria-label="Decrease"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="text-xs font-extrabold text-slate-900 min-w-[14px] text-center">
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQty(dish.id, 1)}
                          className="w-6 h-6 rounded-full bg-[#0D9488] hover:bg-[#0F766E] flex items-center justify-center text-white"
                          aria-label="Increase"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Mobile Floating "Place Order" Bar (Zero Back-and-Forth) ── */}
      {cart.length > 0 && (
        <div className="lg:hidden fixed bottom-16 inset-x-3 z-20">
          <button
            type="button"
            onClick={() => setCheckoutOpen(true)}
            className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl bg-[#0D9488] hover:bg-[#0F766E] text-white shadow-xl active:scale-[0.99] transition"
          >
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="px-2 py-0.5 rounded-full bg-white/20">{totalItems}</span>
              <span>{totalItems === 1 ? 'item' : 'items'} selected</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm font-extrabold">
              <span>Place Order · ₹{total.toFixed(0)}</span>
              <ArrowRight size={16} />
            </div>
          </button>
        </div>
      )}

      {/* ── Mobile Backdrop ── */}
      {checkoutOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-slate-900/45"
          onClick={() => setCheckoutOpen(false)}
        />
      )}

      {/* ── Checkout Pop-up (Compact Bottom Sheet on Mobile, Right Panel on Desktop) ── */}
      <aside
        className={clsx(
          'bg-white border-l border-slate-200/80 flex flex-col overflow-hidden transition-transform duration-200',
          'fixed inset-x-0 bottom-0 max-h-[85dvh] z-50 rounded-t-3xl shadow-2xl lg:static lg:inset-auto lg:max-h-none lg:rounded-none lg:shadow-none lg:w-96 lg:flex-shrink-0',
          checkoutOpen ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'
        )}
      >
        {/* Mobile Pop-up Header */}
        <div className="lg:hidden flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
          <div>
            <div className="text-sm font-bold text-slate-900">Quick Checkout</div>
            <div className="text-[11px] text-slate-400">
              {totalItems} items · Total ₹{total.toFixed(2)}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCheckoutOpen(false)}
            className="p-1.5 rounded-xl bg-slate-100 text-slate-600"
          >
            <X size={16} />
          </button>
        </div>

        {/* Order Type & Table Selector */}
        <div className="p-4 border-b border-slate-100 space-y-3">
          {storeType !== 'small' && (
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setOrderMode('Take Away')}
                className={clsx(
                  'flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all',
                  orderMode === 'Take Away' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                )}
              >
                <ShoppingBag size={14} />
                Take Away
              </button>
              <button
                type="button"
                onClick={() => setOrderMode('Dine In')}
                className={clsx(
                  'flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all',
                  orderMode === 'Dine In' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                )}
              >
                <Utensils size={14} />
                Dine In
              </button>
            </div>
          )}

          {orderMode === 'Dine In' ? (
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
              {tables.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTableId(t.id)}
                  className={clsx(
                    'flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold border transition',
                    selectedTableId === t.id
                      ? 'bg-[#0D9488] text-white border-[#0D9488]'
                      : 'bg-white text-slate-600 border-slate-200'
                  )}
                >
                  T#{t.number}
                </button>
              ))}
            </div>
          ) : (
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Customer name / phone (optional)"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          )}
        </div>

        {/* Compact Cart Summary */}
        <div className="flex-1 overflow-y-auto px-4 py-3 max-h-48 lg:max-h-none">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              Items ({totalItems})
            </span>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setCart([]);
                  setCheckoutOpen(false);
                }}
                className="text-xs text-rose-500 hover:text-rose-600 font-semibold flex items-center gap-1"
              >
                <Trash2 size={12} />
                Clear
              </button>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              Tap items on the left to start an order
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map((c) => (
                <div
                  key={c.dish.id}
                  className="flex items-center justify-between gap-2 bg-slate-50 rounded-xl px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-slate-800 truncate">{c.dish.name}</div>
                    <div className="text-[11px] text-slate-400">
                      ₹{Number(c.dish.price || 0).toFixed(0)} × {c.quantity}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateQty(c.dish.id, -1)}
                      className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center"
                    >
                      <Minus size={11} />
                    </button>
                    <span className="w-4 text-center text-xs font-bold">{c.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateQty(c.dish.id, 1)}
                      className="w-6 h-6 rounded-lg bg-[#0D9488] text-white flex items-center justify-center"
                    >
                      <Plus size={11} />
                    </button>
                  </div>
                  <div className="text-xs font-bold text-slate-900 w-12 text-right">
                    ₹{(Number(c.dish.price || 0) * c.quantity).toFixed(0)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment Method & Actions */}
        <div className="p-4 border-t border-slate-100 space-y-3 bg-slate-50/70">
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal</span>
              <span className="font-semibold text-slate-800">₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>GST ({taxRate}%)</span>
              <span className="font-semibold text-slate-800">₹{tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-extrabold text-slate-900 pt-1.5 border-t border-slate-200">
              <span>Total</span>
              <span>₹{total.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Method: Cash / UPI / Card */}
          <div className="grid grid-cols-3 gap-2">
            {([
              { id: 'Cash', label: 'Cash', icon: Banknote },
              { id: 'Scan', label: 'UPI', icon: Smartphone },
              { id: 'Card', label: 'Card', icon: CreditCard },
            ] as { id: PayMethod; label: string; icon: React.ElementType }[]).map(
              ({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPayMethod(id)}
                  className={clsx(
                    'flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border transition',
                    payMethod === id
                      ? 'bg-[#E6F4F1] border-[#0D9488] text-slate-900'
                      : 'bg-white border-slate-200 text-slate-500'
                  )}
                >
                  <Icon size={14} className={payMethod === id ? 'text-[#0D9488]' : 'text-slate-400'} />
                  {label}
                </button>
              )
            )}
          </div>

          {/* Cash Change Calculator */}
          {payMethod === 'Cash' && cart.length > 0 && (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
                placeholder="Cash received (₹)"
                className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              <div className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                Change: ₹{changeDue.toFixed(0)}
              </div>
            </div>
          )}

          {/* Hold / Pickup Later Options */}
          <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-amber-900">Pickup Later Options</span>
              <div className="flex gap-1">
                {(['Unpaid', 'Paid'] as const).map((ps) => (
                  <button
                    key={ps}
                    type="button"
                    onClick={() => setHoldPaymentStatus(ps)}
                    className={clsx(
                      'px-2 py-0.5 rounded-lg text-[10px] font-bold border',
                      holdPaymentStatus === ps
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-white text-amber-800 border-amber-200'
                    )}
                  >
                    {ps}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {['+15 min', '+30 min', '+1 hr'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setPickupOffset(t)}
                  className={clsx(
                    'flex-1 py-1 rounded-lg text-[10px] font-semibold border',
                    pickupOffset === t
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-white text-slate-600 border-slate-200'
                  )}
                >
                  {t}
                </button>
              ))}
              <button
                type="button"
                onClick={handleHoldOrder}
                disabled={cart.length === 0 || submitting}
                className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-[11px] font-bold"
              >
                Hold
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleCheckout(true, true)}
              disabled={cart.length === 0 || submitting}
              className="flex items-center justify-center gap-1.5 py-3 bg-white border border-teal-600 text-teal-700 hover:bg-teal-50 disabled:opacity-50 rounded-xl text-xs font-bold"
            >
              <Printer size={14} />
              Generate Bill
            </button>
            <button
              type="button"
              onClick={() => handleCheckout(true, false)}
              disabled={cart.length === 0 || submitting}
              className="flex items-center justify-center gap-1.5 py-3 bg-[#0D9488] hover:bg-[#0F766E] disabled:bg-teal-300 text-white rounded-xl text-xs font-bold shadow-sm"
            >
              <CheckCircle2 size={14} />
              {submitting ? 'Saving...' : 'Confirm & Pay'}
            </button>
          </div>
          {storeType === 'big' && (
            <button
              type="button"
              onClick={() => handleCheckout(false, false)}
              disabled={cart.length === 0 || submitting}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-semibold transition"
            >
              Send to Kitchen
            </button>
          )}
        </div>
      </aside>

      {/* Held / Pickup Later Orders Modal */}
      {heldOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/45 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl max-h-[80dvh] flex flex-col overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="text-sm font-bold text-slate-900">
                Held / Pickup Later ({heldOrders.length})
              </div>
              <button
                type="button"
                onClick={() => setHeldOpen(false)}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {heldOrders.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  No held orders waiting for pickup.
                </div>
              ) : (
                heldOrders.map((o) => (
                  <div
                    key={o.id}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          {o.orderNumber} · {o.customerName || 'Walk-in'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {o.items.map((i) => `${i.quantity}x ${i.dishName}`).join(', ')}
                        </div>
                        {o.pickupTime && (
                          <div className="text-[10px] text-amber-700 font-semibold mt-0.5">
                            Pickup: {o.pickupTime}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-extrabold text-slate-900">
                          ₹{Number(o.total).toFixed(0)}
                        </div>
                        <span
                          className={clsx(
                            'inline-block text-[10px] font-bold px-2 py-0.5 rounded-full',
                            o.paymentStatus === 'Unpaid'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-emerald-100 text-emerald-700'
                          )}
                        >
                          {o.paymentStatus || 'Paid'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {o.paymentStatus === 'Unpaid' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleCompleteHeld(o, 'Cash')}
                            className="flex-1 py-1.5 rounded-lg bg-[#0D9488] text-white text-[11px] font-bold"
                          >
                            Pay Cash &amp; Done
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCompleteHeld(o, 'Scan')}
                            className="flex-1 py-1.5 rounded-lg bg-slate-900 text-white text-[11px] font-bold"
                          >
                            Pay UPI &amp; Done
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleCompleteHeld(o)}
                          className="flex-1 py-1.5 rounded-lg bg-emerald-600 text-white text-[11px] font-bold"
                        >
                          Mark Handed Over
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={async () => {
                          if (!confirm(`Cancel held order ${o.orderNumber}?`)) return;
                          await deleteOrder(token, o.id);
                          await loadData();
                          toast.success(`Cancelled ${o.orderNumber}`);
                        }}
                        className="px-2.5 py-1.5 rounded-lg border border-rose-200 text-rose-600 text-[11px] font-bold"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Online Order Queries Modal (1-Tap Convert to Paid Order) */}
      {queriesOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/45 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl max-h-[82dvh] flex flex-col overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-indigo-50/50">
              <div className="flex items-center gap-2">
                <Globe size={16} className="text-indigo-600" />
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    Online Order Queries ({orderQueries.length})
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Tap payment method once paid to convert into a POS Order
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQueriesOpen(false)}
                className="p-1.5 rounded-lg bg-white text-slate-600 border border-slate-200"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {orderQueries.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No pending online order queries right now.
                </div>
              ) : (
                orderQueries.map((q) => {
                  const busy = convertingQueryId === q.id;
                  return (
                    <div
                      key={q.id}
                      className="p-3.5 rounded-2xl border border-indigo-100 bg-slate-50/70 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-extrabold text-indigo-700">{q.queryNumber}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                              {q.orderType}
                            </span>
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {q.customerName || 'Online Customer'}
                            </span>
                          </div>
                          {q.phone && (
                            <div className="text-[11px] text-slate-500 mt-0.5">Ph: {q.phone}</div>
                          )}
                          <div className="text-xs text-slate-700 font-medium mt-1">
                            {q.items.map((i) => `${i.quantity}x ${i.dishName}`).join(', ')}
                          </div>
                          {q.note && (
                            <div className="text-[11px] text-amber-700 mt-0.5">Note: {q.note}</div>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-extrabold text-slate-900">
                            ₹{Number(q.total || 0).toFixed(0)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(q.createdAt).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleConvertQuery(q, 'Scan')}
                          className="flex-1 py-2 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] disabled:opacity-50 text-white text-[11px] font-bold transition"
                        >
                          {busy ? 'Converting...' : 'Paid UPI → Order'}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleConvertQuery(q, 'Cash')}
                          className="flex-1 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-[11px] font-bold transition"
                        >
                          Paid Cash → Order
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleConvertQuery(q, 'Card')}
                          className="px-3 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-50 text-slate-700 text-[11px] font-bold transition"
                        >
                          Card
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleDismissQuery(q)}
                          className="px-2.5 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-[11px] font-bold transition"
                          title="Dismiss query"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Thermal Printer Receipt Preview & Print Modal */}
      <ThermalReceiptModal receipt={receiptData} onClose={() => setReceiptData(null)} />
    </div>
  );
}
