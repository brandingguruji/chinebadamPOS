'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { getToken } from '@/lib/auth';
import { useToast } from '@/components/ToastProvider';
import { getOrders, getDishes, getTables, createOrder, updateOrder, deleteOrder } from '@/lib/api';
import type { Order, Dish, Table, OrderItem, OrderStatus } from '@/types';
import clsx from 'clsx';
import {
  ChevronLeft,
  ChevronRight,
  Edit3,
  Trash2,
  Minus,
  Plus,
  Printer,
  Banknote,
  CreditCard,
  ScanLine,
  CheckCircle2,
  Utensils,
  Sparkles,
  Soup,
  CakeSlice,
  Drumstick,
  ShoppingBag,
  Calendar,
  X,
  ShoppingCart,
} from 'lucide-react';

type CartItem = { dish: Dish; quantity: number };
type PayMethod = 'Cash' | 'Card' | 'Scan';
type CategoryFilter = 'All Menu' | 'Special' | 'Soups' | 'Desserts' | 'Chickens';
type StatusFilter = 'All' | 'Dine in' | 'Wait List' | 'Take Away' | 'Served';

const STATUS_CARD_STYLE: Record<OrderStatus, { card: string; badge: string; label: string }> = {
  InKitchen: {
    card: 'bg-[#D5F0EC] border-[#BCE6DF]',
    badge: 'bg-[#0F766E] text-white',
    label: 'In Kitchen',
  },
  WaitList: {
    card: 'bg-[#FCE8E0] border-[#F7D4C6]',
    badge: 'bg-[#C2542D] text-white',
    label: 'Wait List',
  },
  Ready: {
    card: 'bg-[#E6DCF8] border-[#D5C5F3]',
    badge: 'bg-[#6D47A6] text-white',
    label: 'Ready',
  },
  Served: {
    card: 'bg-slate-100 border-slate-200',
    badge: 'bg-slate-600 text-white',
    label: 'Served',
  },
  Hold: {
    card: 'bg-amber-50 border-amber-200',
    badge: 'bg-amber-600 text-white',
    label: 'On Hold',
  },
};

const FILTER_BADGE_COLORS: Record<StatusFilter, string> = {
  All: 'bg-[#0D9488] text-white',
  'Dine in': 'bg-[#166534] text-white',
  'Wait List': 'bg-[#EA580C] text-white',
  'Take Away': 'bg-[#7E57C2] text-white',
  Served: 'bg-[#15803D] text-white',
};

const CATEGORY_META: { name: CategoryFilter; icon: React.ElementType; color: string }[] = [
  { name: 'All Menu', icon: Utensils, color: 'text-amber-500 bg-amber-50' },
  { name: 'Special', icon: Sparkles, color: 'text-teal-600 bg-teal-50' },
  { name: 'Soups', icon: Soup, color: 'text-rose-500 bg-rose-50' },
  { name: 'Desserts', icon: CakeSlice, color: 'text-pink-500 bg-pink-50' },
  { name: 'Chickens', icon: Drumstick, color: 'text-orange-500 bg-orange-50' },
];

function timeAgo(iso: string) {
  const diffMins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (diffMins < 1) return 'Just Now';
  if (diffMins === 1) return '1 min ago';
  if (diffMins < 60) return `${diffMins} mins ago`;
  const hrs = Math.floor(diffMins / 60);
  return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
}

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function OrderLinePage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('All Menu');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [payMethod, setPayMethod] = useState<PayMethod>('Card');
  const [orderType, setOrderType] = useState<'Dine In' | 'Take Away'>('Dine In');
  const [customerName, setCustomerName] = useState<string>('');
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [placing, setPlacing] = useState(false);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  const orderScrollRef = useRef<HTMLDivElement>(null);
  const catScrollRef = useRef<HTMLDivElement>(null);

  const token = getToken() ?? '';

  const toast = useToast();

  const loadData = useCallback(async () => {
    try {
      const [o, d, t] = await Promise.all([
        getOrders(token, undefined, selectedDate),
        getDishes(token),
        getTables(token),
      ]);
      setOrders(o);
      setDishes(d);
      setTables(t);
      if (!selectedTableId && t.length > 0) {
        const defaultTable = t.find((tbl) => tbl.number === 4) ?? t[0];
        setSelectedTableId(defaultTable.id);
      }
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'Failed to update order');
    } finally {
      setLoading(false);
    }
  }, [token, selectedTableId, selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const isTakeAwayOrder = (o: Order) =>
    o.orderType === 'Take Away' || o.tableId === 'takeaway' || o.tableNumber === 0;

  const filteredOrders = orders.filter((o) => {
    if (statusFilter === 'All') return true;
    if (statusFilter === 'Wait List') return o.status === 'WaitList';
    if (statusFilter === 'Served') return o.status === 'Served';
    if (statusFilter === 'Take Away') return isTakeAwayOrder(o);
    if (statusFilter === 'Dine in') return !isTakeAwayOrder(o) && (o.status === 'InKitchen' || o.status === 'Ready');
    return false;
  });

  const filteredDishes = dishes.filter((d) =>
    categoryFilter === 'All Menu' ? true : d.category === categoryFilter
  );

  const statusCounts: Record<StatusFilter, number> = {
    All: orders.length,
    'Dine in': orders.filter((o) => !isTakeAwayOrder(o) && (o.status === 'InKitchen' || o.status === 'Ready')).length,
    'Wait List': orders.filter((o) => o.status === 'WaitList').length,
    'Take Away': orders.filter((o) => isTakeAwayOrder(o)).length,
    Served: orders.filter((o) => o.status === 'Served').length,
  };

  const categoryCounts: Record<CategoryFilter, number> = {
    'All Menu': dishes.length,
    Special: dishes.filter((d) => d.category === 'Special').length,
    Soups: dishes.filter((d) => d.category === 'Soups').length,
    Desserts: dishes.filter((d) => d.category === 'Desserts').length,
    Chickens: dishes.filter((d) => d.category === 'Chickens').length,
  };

  const subtotal = cart.reduce((s, c) => s + c.dish.price * c.quantity, 0);
  const tax = cart.length > 0 ? parseFloat((subtotal * 0.06).toFixed(2)) : 0;
  const donation = cart.length > 0 ? 1.0 : 0;
  const total = subtotal + tax + donation;
  const totalItemCount = cart.reduce((s, c) => s + c.quantity, 0);

  const selectedTable = tables.find((t) => t.id === selectedTableId);

  function addToCart(dish: Dish) {
    setCart((prev) => {
      const existing = prev.find((c) => c.dish.id === dish.id);
      if (existing) {
        return prev.map((c) => (c.dish.id === dish.id ? { ...c, quantity: c.quantity + 1 } : c));
      }
      return [...prev, { dish, quantity: 1 }];
    });
  }

  function decreaseCart(dish: Dish) {
    setCart((prev) => {
      const existing = prev.find((c) => c.dish.id === dish.id);
      if (!existing) return prev;
      if (existing.quantity === 1) return prev.filter((c) => c.dish.id !== dish.id);
      return prev.map((c) => (c.dish.id === dish.id ? { ...c, quantity: c.quantity - 1 } : c));
    });
  }

  function getCartQty(dishId: string) {
    return cart.find((c) => c.dish.id === dishId)?.quantity ?? 0;
  }

  async function handlePlaceOrder() {
    if (cart.length === 0) return;
    if (orderType === 'Dine In' && !selectedTableId) return;
    setPlacing(true);
    try {
      const items: OrderItem[] = cart.map((c) => ({
        dishId: c.dish.id,
        dishName: c.dish.name,
        quantity: c.quantity,
        unitPrice: c.dish.price,
      }));
      const created = await createOrder(token, {
        tableId: orderType === 'Dine In' ? selectedTableId : 'takeaway',
        orderType,
        customerName: customerName.trim() || 'Walk-in',
        items,
        paymentMethod: payMethod,
      });
      setCart([]);
      setCustomerName('');
      setMobileCartOpen(false);
      await loadData();
      toast.success(
        orderType === 'Take Away'
          ? `Take Away Order ${created.orderNumber} placed!`
          : `Order ${created.orderNumber} placed for Table #${created.tableNumber}`
      );
    } catch (e) {
      console.error(e);
      toast.error('Failed to place order');
    } finally {
      setPlacing(false);
    }
  }

  async function handleStatusChange(order: Order, status: OrderStatus) {
    try {
      await updateOrder(token, order.id, { status });
      await loadData();
      if (selectedOrder?.id === order.id) setSelectedOrder({ ...order, status });
      toast.success(`Order ${order.orderNumber} updated to ${STATUS_CARD_STYLE[status].label}`);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'Failed to update order');
    }
  }

  async function handleDeleteOrder(order: Order) {
    if (!confirm(`Delete order ${order.orderNumber}?`)) return;
    try {
      await deleteOrder(token, order.id);
      setOrders((prev) => prev.filter((o) => o.id !== order.id));
      if (selectedOrder?.id === order.id) setSelectedOrder(null);
      toast.success(`Deleted order ${order.orderNumber}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete order');
    }
  }

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-hidden relative">
      {/* ── Center / Left Panel ── */}
      <div className="flex-1 flex flex-col overflow-y-auto px-3 sm:px-6 py-4 sm:py-5 gap-4 sm:gap-5 pb-24 lg:pb-6">
        {/* Order Line Heading + Date Filter + Status Pills */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h1 className="text-lg font-bold text-slate-800">Order Line</h1>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedDate(getTodayStr())}
                className={clsx(
                  'px-3 py-1.5 rounded-xl text-xs font-semibold border transition',
                  selectedDate === getTodayStr()
                    ? 'bg-[#0D9488] text-white border-[#0D9488]'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                )}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate('all')}
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
                  onChange={(e) => setSelectedDate(e.target.value || 'all')}
                  className="pl-7 pr-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {(['All', 'Dine in', 'Wait List', 'Take Away', 'Served'] as StatusFilter[]).map((s) => {
              const active = statusFilter === s;
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={clsx(
                    'flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium transition-all border',
                    active
                      ? 'bg-[#E6F4F1] border-[#0D9488] text-slate-900 font-semibold'
                      : 'bg-white border-slate-200/80 text-slate-600 hover:border-slate-300'
                  )}
                >
                  <span>{s}</span>
                  <span
                    className={clsx(
                      'min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center',
                      FILTER_BADGE_COLORS[s]
                    )}
                  >
                    {String(statusCounts[s]).padStart(2, '0')}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Horizontal Pastel Order Cards */}
        <div className="relative">
          <div
            ref={orderScrollRef}
            className="flex gap-3.5 overflow-x-auto scrollbar-hide pb-1"
          >
            {filteredOrders.length === 0 && (
              <div className="text-xs text-slate-400 py-6">No orders in this filter.</div>
            )}
            {filteredOrders.map((order) => {
              const style = STATUS_CARD_STYLE[order.status];
              const totalQty = order.items.reduce((acc, it) => acc + it.quantity, 0);
              const isSelected = selectedOrder?.id === order.id;
              return (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrder(isSelected ? null : order)}
                  className={clsx(
                    'flex-shrink-0 w-56 rounded-2xl p-4 border cursor-pointer transition-all',
                    style.card,
                    isSelected && 'ring-2 ring-teal-600'
                  )}
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2">
                    <span>Order {order.orderNumber}</span>
                    <div className="flex items-center gap-1.5">
                      <span>{isTakeAwayOrder(order) ? 'Take Away' : `Table ${String(order.tableNumber).padStart(2, '0')}`}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteOrder(order);
                        }}
                        className="p-0.5 rounded text-slate-500 hover:text-rose-600 transition"
                        title="Delete order"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  <div className="text-sm font-bold text-slate-900 mb-3">Item: {totalQty}X</div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-600">{timeAgo(order.createdAt)}</span>
                    <select
                      value={order.status}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handleStatusChange(order, e.target.value as OrderStatus)}
                      className={clsx(
                        'text-[11px] font-semibold px-2.5 py-1 rounded-full border-0 cursor-pointer focus:outline-none',
                        style.badge
                      )}
                    >
                      <option value="InKitchen" className="bg-white text-slate-800">In Kitchen</option>
                      <option value="WaitList" className="bg-white text-slate-800">Wait List</option>
                      <option value="Ready" className="bg-white text-slate-800">Ready</option>
                      <option value="Served" className="bg-white text-slate-800">Served</option>
                      <option value="Hold" className="bg-white text-slate-800">On Hold</option>
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
          {filteredOrders.length > 3 && (
            <button
              onClick={() => orderScrollRef.current?.scrollBy({ left: 240, behavior: 'smooth' })}
              className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-md border border-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-50"
            >
              <ChevronRight size={16} />
            </button>
          )}
        </div>

        {/* Foodies Menu Header */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-slate-800">Foodies Menu</h2>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => catScrollRef.current?.scrollBy({ left: -200, behavior: 'smooth' })}
                className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => catScrollRef.current?.scrollBy({ left: 200, behavior: 'smooth' })}
                className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Category Cards */}
          <div ref={catScrollRef} className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            {CATEGORY_META.map(({ name, icon: Icon, color }) => {
              const active = categoryFilter === name;
              return (
                <button
                  key={name}
                  onClick={() => setCategoryFilter(name)}
                  className={clsx(
                    'flex-shrink-0 flex items-center gap-3 px-4 py-2.5 rounded-xl border text-left transition-all min-w-[135px]',
                    active
                      ? 'bg-[#E6F4F1] border-[#0D9488] shadow-sm'
                      : 'bg-white border-slate-100 hover:border-slate-200'
                  )}
                >
                  <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', color)}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">{name}</div>
                    <div className="text-[11px] text-slate-400">{categoryCounts[name]} Items</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dish Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-6">
          {filteredDishes.map((dish) => {
            const qty = getCartQty(dish.id);
            return (
              <div
                key={dish.id}
                className={clsx(
                  'bg-white rounded-2xl p-4 border transition-all flex flex-col',
                  qty > 0
                    ? 'border-[#0D9488] ring-1 ring-[#0D9488]/20 shadow-sm'
                    : 'border-slate-100 hover:border-slate-200 shadow-xs'
                )}
              >
                {/* Circular Dish Image */}
                <div className="flex justify-center mb-3">
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-100 border-4 border-slate-50 shadow-sm flex items-center justify-center">
                    {dish.image ? (
                      <img
                        src={dish.image}
                        alt={dish.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xl font-bold text-teal-600">{dish.name.charAt(0)}</span>
                    )}
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 mb-0.5">{dish.category}</div>
                <div className="text-xs font-bold text-slate-800 leading-snug mb-3 line-clamp-1">
                  {dish.name}
                </div>

                <div className="mt-auto flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900">₹{dish.price.toFixed(2)}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => decreaseCart(dish)}
                      disabled={qty === 0}
                      className="w-6 h-6 rounded-full border border-slate-200 hover:bg-slate-100 disabled:opacity-35 flex items-center justify-center text-slate-600 transition"
                    >
                      <Minus size={11} />
                    </button>
                    <span className="text-xs font-bold text-slate-800 w-3 text-center">{qty}</span>
                    <button
                      onClick={() => addToCart(dish)}
                      className="w-6 h-6 rounded-full bg-[#0D9488] hover:bg-[#0F766E] flex items-center justify-center text-white transition"
                    >
                      <Plus size={11} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right Order Summary Panel ── */}
      {/* Mobile Floating Order Summary Bar */}
      <div className="lg:hidden fixed bottom-16 inset-x-3 z-20">
        <button
          type="button"
          onClick={() => setMobileCartOpen(true)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-[#0D9488] text-white shadow-lg active:scale-[0.99] transition"
        >
          <div className="flex items-center gap-2 text-xs font-bold">
            <ShoppingCart size={16} />
            <span>{totalItemCount} item{totalItemCount !== 1 ? 's' : ''}</span>
          </div>
          <div className="text-sm font-extrabold">Order Summary · ₹{total.toFixed(0)}</div>
        </button>
      </div>

      {mobileCartOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-slate-900/40"
          onClick={() => setMobileCartOpen(false)}
        />
      )}
      <aside
        className={clsx(
          'bg-white border-l border-slate-100 flex flex-col overflow-hidden transition-transform duration-200',
          'fixed inset-x-0 bottom-0 top-10 z-50 rounded-t-3xl shadow-2xl lg:static lg:inset-auto lg:rounded-none lg:shadow-none lg:w-80 lg:flex-shrink-0',
          mobileCartOpen ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'
        )}
      >
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <span className="text-sm font-bold text-slate-800">Order Summary ({totalItemCount})</span>
          <button
            type="button"
            onClick={() => setMobileCartOpen(false)}
            className="p-1.5 rounded-lg bg-slate-100 text-slate-600"
          >
            <X size={16} />
          </button>
        </div>
        {/* Order Type & Table Info */}
        <div className="px-5 py-4 border-b border-slate-100">
          {/* 2-Type Switch: Table vs Take Away */}
          <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl mb-3">
            <button
              type="button"
              onClick={() => setOrderType('Dine In')}
              className={clsx(
                'flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
                orderType === 'Dine In'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              <Utensils size={13} />
              Table
            </button>
            <button
              type="button"
              onClick={() => setOrderType('Take Away')}
              className={clsx(
                'flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
                orderType === 'Take Away'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              <ShoppingBag size={13} />
              Take Away
            </button>
          </div>

          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="text-[15px] font-bold text-slate-900">
                {orderType === 'Take Away'
                  ? 'Take Away Bill'
                  : `Table No #${String(selectedTable?.number ?? 4).padStart(2, '0')}`}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Order #F00{orders.length + 26}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <div className="flex items-center gap-2">
                <button
                  title="Edit order"
                  className="text-slate-400 hover:text-slate-700 transition"
                >
                  <Edit3 size={15} />
                </button>
                <button
                  onClick={() => setCart([])}
                  title="Clear cart"
                  className="text-slate-400 hover:text-red-500 transition"
                >
                  <Trash2 size={15} />
                </button>
              </div>
              <div className="text-xs font-semibold text-slate-700">
                {orderType === 'Take Away' ? 'Counter Pickup' : `${selectedTable?.capacity ?? 2} People`}
              </div>
            </div>
          </div>

          {orderType === 'Dine In' ? (
            <select
              value={selectedTableId}
              onChange={(e) => setSelectedTableId(e.target.value)}
              className="mt-2 w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              {tables.map((t) => (
                <option key={t.id} value={t.id}>
                  Table #{String(t.number).padStart(2, '0')} — {t.capacity} Seats ({t.status})
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Customer name / phone (optional)"
              className="mt-2 w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          )}
        </div>

        {/* Ordered Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="text-sm font-bold text-slate-900">Ordered Items</h3>
            <span className="text-xs font-semibold text-slate-500">
              {String(totalItemCount).padStart(2, '0')}
            </span>
          </div>

          {cart.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400">
              Click <span className="font-bold text-teal-600">+</span> on any dish to add it to this order.
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((c) => (
                <div key={c.dish.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <span className="font-semibold text-slate-500">{c.quantity}x</span>
                    <span className="text-slate-700 truncate">{c.dish.name}</span>
                  </div>
                  <span className="font-semibold text-slate-900 flex-shrink-0">
                    ₹{(c.dish.price * c.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment Summary */}
        <div className="px-5 py-4 border-t border-slate-100 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-3">Payment Summary</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-800">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Tax</span>
                <span className="font-semibold text-slate-800">₹{tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Donation</span>
                <span className="font-semibold text-slate-800">₹{donation.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-900 pt-2.5 border-t border-slate-100">
                <span>Total Payable</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <div className="text-xs font-bold text-slate-800 mb-2">Payment Method</div>
            <div className="grid grid-cols-3 gap-2">
              {([
                { id: 'Cash', icon: Banknote },
                { id: 'Card', icon: CreditCard },
                { id: 'Scan', icon: ScanLine },
              ] as { id: PayMethod; icon: React.ElementType }[]).map(({ id, icon: Icon }) => {
                const active = payMethod === id;
                return (
                  <button
                    key={id}
                    onClick={() => setPayMethod(id)}
                    className={clsx(
                      'flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border transition-all',
                      active
                        ? 'bg-[#E6F4F1] border-[#0D9488] text-slate-900'
                        : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                    )}
                  >
                    <Icon size={13} className={active ? 'text-[#0D9488]' : 'text-slate-400'} />
                    {id}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Action Buttons */}
          <div className="grid grid-cols-5 gap-2 pt-1">
            <button
              onClick={handlePrint}
              className="col-span-2 flex items-center justify-center gap-1.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <Printer size={14} />
              Print
            </button>
            <button
              onClick={handlePlaceOrder}
              disabled={cart.length === 0 || placing}
              className="col-span-3 flex items-center justify-center gap-1.5 py-2.5 bg-[#0D9488] hover:bg-[#0F766E] disabled:bg-teal-300 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm"
            >
              <CheckCircle2 size={14} />
              {placing ? 'Placing...' : 'Place Order'}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
