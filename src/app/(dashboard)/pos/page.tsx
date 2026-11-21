'use client';

import { useEffect, useState, useCallback } from 'react';
import { getToken } from '@/lib/auth';
import { useToast } from '@/components/ToastProvider';
import { getDishes, getTables, getOrders, createOrder } from '@/lib/api';
import type { Dish, Table, Order, OrderItem } from '@/types';
import clsx from 'clsx';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Banknote,
  CreditCard,
  ScanLine,
  Printer,
  CheckCircle2,
  Zap,
  ShoppingBag,
  Utensils,
  Calendar,
  X,
  ShoppingCart,
} from 'lucide-react';

type CartItem = { dish: Dish; quantity: number };
type PayMethod = 'Cash' | 'Card' | 'Scan';
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
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  const token = getToken() ?? '';

  const toast = useToast();

  const loadData = useCallback(async () => {
    try {
      const [d, t, o] = await Promise.all([
        getDishes(token),
        getTables(token),
        getOrders(token, undefined, selectedDate),
      ]);
      setDishes(d.filter((item) => item.available !== false));
      setTables(t);
      setDayOrders(o);
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
  const tax = parseFloat((subtotal * 0.05).toFixed(2));
  const total = parseFloat((subtotal + tax).toFixed(2));
  const totalItems = cart.reduce((s, c) => s + c.quantity, 0);

  const cashNum = Number(cashReceived) || 0;
  const changeDue = payMethod === 'Cash' && cashNum > 0 ? Math.max(0, cashNum - total) : 0;

  async function handleCheckout(instantComplete: boolean) {
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

      setCart([]);
      setCashReceived('');
      setCustomerName('');
      setMobileCartOpen(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-hidden bg-[#F7F9FA] relative">
      {/* ── Left: Fast Tap Menu Grid ── */}
      <div className="flex-1 flex flex-col overflow-hidden p-3 sm:p-5 gap-3 sm:gap-4 pb-20 lg:pb-5">
        {/* Top Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#0D9488] text-white flex items-center justify-center">
              <Zap size={16} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">Quick Order POS</h1>
              <p className="text-[11px] text-slate-500">Tap any item to add instantly</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-200 text-xs font-semibold text-teal-800">
              {dayOrders.length} Orders · ₹{dayOrders.reduce((s, o) => s + Number(o.total || 0), 0).toFixed(0)}
            </div>
            <div className="relative flex items-center">
              <Calendar size={13} className="absolute left-2.5 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={selectedDate === 'all' ? '' : selectedDate}
                onChange={(e) => setSelectedDate(e.target.value || 'all')}
                className="pl-7 pr-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div className="relative w-56 max-w-full">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Quick search item..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide flex-shrink-0 pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={clsx(
                'flex-shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition-all border',
                category === cat
                  ? 'bg-[#0D9488] text-white border-[#0D9488] shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* One-Tap Dish Tiles */}
        <div className="flex-1 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filteredDishes.map((dish) => {
              const qty = getQty(dish.id);
              return (
                <button
                  key={dish.id}
                  type="button"
                  onClick={() => addItem(dish)}
                  className={clsx(
                    'relative text-left bg-white rounded-2xl p-3.5 border transition-all active:scale-[0.98] flex flex-col justify-between min-h-[118px]',
                    qty > 0
                      ? 'border-[#0D9488] ring-2 ring-[#0D9488]/20 bg-[#F0FDFA]/40'
                      : 'border-slate-200/80 hover:border-teal-300 hover:shadow-sm'
                  )}
                >
                  {qty > 0 && (
                    <span className="absolute -top-2 -right-2 min-w-[24px] h-6 px-1.5 rounded-full bg-[#0D9488] text-white text-xs font-bold flex items-center justify-center shadow">
                      {qty}
                    </span>
                  )}
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">
                      {dish.category}
                    </div>
                    <div className="text-xs font-bold text-slate-800 leading-snug line-clamp-2">
                      {dish.name}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm font-extrabold text-[#0D9488]">
                      ₹{Number(dish.price || 0).toFixed(0)}
                    </span>
                    <span className="w-6 h-6 rounded-full bg-teal-50 text-[#0D9488] flex items-center justify-center">
                      <Plus size={13} />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Right: Express Checkout Panel ── */}
      {/* Mobile Floating Cart Bar */}
      <div className="lg:hidden fixed bottom-16 inset-x-3 z-20">
        <button
          type="button"
          onClick={() => setMobileCartOpen(true)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-[#0D9488] text-white shadow-lg active:scale-[0.99] transition"
        >
          <div className="flex items-center gap-2 text-xs font-bold">
            <ShoppingCart size={16} />
            <span>{totalItems} item{totalItems !== 1 ? 's' : ''}</span>
          </div>
          <div className="text-sm font-extrabold">View Bill · ₹{total.toFixed(0)}</div>
        </button>
      </div>

      {/* Checkout Panel: Drawer on mobile, fixed right sidebar on lg+ */}
      {mobileCartOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-slate-900/40"
          onClick={() => setMobileCartOpen(false)}
        />
      )}
      <aside
        className={clsx(
          'bg-white border-l border-slate-200/80 flex flex-col overflow-hidden transition-transform duration-200',
          'fixed inset-x-0 bottom-0 top-10 z-50 rounded-t-3xl shadow-2xl lg:static lg:inset-auto lg:rounded-none lg:shadow-none lg:w-96 lg:flex-shrink-0',
          mobileCartOpen ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'
        )}
      >
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <span className="text-sm font-bold text-slate-800">Current Bill ({totalItems})</span>
          <button
            type="button"
            onClick={() => setMobileCartOpen(false)}
            className="p-1.5 rounded-lg bg-slate-100 text-slate-600"
          >
            <X size={16} />
          </button>
        </div>
        {/* Order Mode Toggle */}
        <div className="p-4 border-b border-slate-100 space-y-3">
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setOrderMode('Take Away')}
              className={clsx(
                'flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all',
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
                'flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all',
                orderMode === 'Dine In' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              )}
            >
              <Utensils size={14} />
              Dine In
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Customer (optional)"
              className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            {orderMode === 'Dine In' ? (
              <select
                value={selectedTableId}
                onChange={(e) => setSelectedTableId(e.target.value)}
                className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>
                    Table #{t.number} ({t.status})
                  </option>
                ))}
              </select>
            ) : (
              <div className="px-3 py-2 text-xs bg-teal-50 text-teal-700 font-semibold rounded-xl flex items-center justify-center">
                Counter Pickup
              </div>
            )}
          </div>
        </div>

        {/* Cart List */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Current Bill ({totalItems} items)
            </span>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="text-xs text-rose-500 hover:text-rose-600 font-medium flex items-center gap-1"
              >
                <Trash2 size={12} />
                Clear
              </button>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center text-slate-400 text-xs text-center">
              <Zap size={24} className="mb-2 text-slate-300" />
              Tap items on the left to build a quick bill
            </div>
          ) : (
            <div className="space-y-2.5">
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
                      onClick={() => updateQty(c.dish.id, -1)}
                      className="w-6 h-6 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center"
                    >
                      <Minus size={11} />
                    </button>
                    <span className="w-5 text-center text-xs font-bold">{c.quantity}</span>
                    <button
                      onClick={() => updateQty(c.dish.id, 1)}
                      className="w-6 h-6 rounded-lg bg-[#0D9488] text-white hover:bg-[#0F766E] flex items-center justify-center"
                    >
                      <Plus size={11} />
                    </button>
                  </div>
                  <div className="text-xs font-bold text-slate-900 w-14 text-right">
                    ₹{(Number(c.dish.price || 0) * c.quantity).toFixed(0)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals & Payment */}
        <div className="p-4 border-t border-slate-100 space-y-3 bg-slate-50/60">
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal</span>
              <span className="font-semibold text-slate-800">₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>GST (5%)</span>
              <span className="font-semibold text-slate-800">₹{tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-extrabold text-slate-900 pt-1.5 border-t border-slate-200">
              <span>Total</span>
              <span>₹{total.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="grid grid-cols-3 gap-2">
            {([
              { id: 'Cash', label: 'Cash', icon: Banknote },
              { id: 'Scan', label: 'UPI / QR', icon: ScanLine },
              { id: 'Card', label: 'Card', icon: CreditCard },
            ] as { id: PayMethod; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setPayMethod(id)}
                className={clsx(
                  'flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-semibold border transition',
                  payMethod === id
                    ? 'bg-[#E6F4F1] border-[#0D9488] text-slate-900'
                    : 'bg-white border-slate-200 text-slate-500'
                )}
              >
                <Icon size={13} className={payMethod === id ? 'text-[#0D9488]' : 'text-slate-400'} />
                {label}
              </button>
            ))}
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

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => window.print()}
              disabled={cart.length === 0}
              className="flex items-center justify-center gap-1.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 rounded-xl text-xs font-semibold text-slate-700"
            >
              <Printer size={14} />
              Print Bill
            </button>
            <button
              type="button"
              onClick={() => handleCheckout(true)}
              disabled={cart.length === 0 || submitting}
              className="flex items-center justify-center gap-1.5 py-2.5 bg-[#0D9488] hover:bg-[#0F766E] disabled:bg-teal-300 text-white rounded-xl text-xs font-bold shadow-sm"
            >
              <CheckCircle2 size={14} />
              {submitting ? 'Saving...' : 'Pay & Complete'}
            </button>
          </div>
          <button
            type="button"
            onClick={() => handleCheckout(false)}
            disabled={cart.length === 0 || submitting}
            className="w-full py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-semibold transition"
          >
            Send to Kitchen (In Kitchen)
          </button>
        </div>
      </aside>
    </div>
  );
}
