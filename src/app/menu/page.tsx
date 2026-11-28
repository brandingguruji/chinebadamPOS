'use client';

import { useEffect, useState, useMemo } from 'react';
import clsx from 'clsx';
import {
  Search,
  MapPin,
  ArrowLeft,
  Plus,
  Minus,
  ShoppingBag,
  X,
  MessageCircle,
  UtensilsCrossed,
  ChevronRight,
  Trash2,
  Phone,
  Sparkles,
} from 'lucide-react';

interface PublicStore {
  name: string;
  logo: string;
  address: string;
  phone: string;
  whatsappLink: string;
  taxRate: number;
  currency: string;
}

interface PublicCategory {
  name: string;
  count: number;
  image: string;
}

interface PublicDish {
  id: string;
  name: string;
  category: string;
  price: number;
  description?: string;
  image?: string;
}

type CartItem = { dish: PublicDish; quantity: number };

const CATEGORY_CARD_TINTS = [
  'bg-amber-50/80 border-amber-200/70',
  'bg-teal-50/80 border-teal-200/70',
  'bg-rose-50/80 border-rose-200/70',
  'bg-indigo-50/80 border-indigo-200/70',
  'bg-emerald-50/80 border-emerald-200/70',
  'bg-orange-50/80 border-orange-200/70',
];

function buildWhatsAppUrl(whatsappLink: string, fallbackPhone: string, message: string): string | null {
  const raw = (whatsappLink || '').trim() || (fallbackPhone || '').trim();
  if (!raw) return null;

  const encoded = encodeURIComponent(message);

  // If admin saved a full URL (e.g. https://wa.me/91... or https://api.whatsapp.com/send?phone=...)
  if (/^https?:\/\//i.test(raw)) {
    const separator = raw.includes('?') ? '&' : '?';
    return `${raw}${separator}text=${encoded}`;
  }

  // Otherwise treat as a phone number
  let digits = raw.replace(/[^\d]/g, '');
  if (!digits) return null;
  if (digits.length === 10) {
    digits = `91${digits}`;
  }
  return `https://wa.me/${digits}?text=${encoded}`;
}

export default function PublicMenuPage() {
  const [store, setStore] = useState<PublicStore | null>(null);
  const [categories, setCategories] = useState<PublicCategory[]>([]);
  const [dishes, setDishes] = useState<PublicDish[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartModalOpen, setCartModalOpen] = useState(false);

  // Customer order details for WhatsApp message
  const [customerName, setCustomerName] = useState('');
  const [orderType, setOrderType] = useState<'Take Away' | 'Delivery' | 'Dine In'>('Take Away');
  const [customerNote, setCustomerNote] = useState('');

  useEffect(() => {
    fetch('/api/public/menu', { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load menu');
        return res.json();
      })
      .then((data) => {
        setStore(data.store);
        setCategories(data.categories || []);
        setDishes(data.dishes || []);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Unable to load menu right now.');
      })
      .finally(() => setLoading(false));
  }, []);

  const isSearching = search.trim().length > 0;
  const showingDishes = selectedCategory !== null || isSearching;

  const visibleDishes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return dishes.filter((d) => {
      const matchSearch =
        !q ||
        (d.name || '').toLowerCase().includes(q) ||
        (d.category || '').toLowerCase().includes(q) ||
        (d.description || '').toLowerCase().includes(q);
      const matchCat =
        isSearching || selectedCategory === 'All' || !selectedCategory
          ? true
          : d.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [dishes, search, isSearching, selectedCategory]);

  function addItem(dish: PublicDish) {
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

  const totalItems = cart.reduce((s, c) => s + c.quantity, 0);
  const subtotal = cart.reduce((s, c) => s + Number(c.dish.price || 0) * c.quantity, 0);

  function handleSendWhatsApp() {
    if (cart.length === 0 || !store) return;

    const lines: string[] = [
      `*New Order — ${store.name}*`,
      `Order Type: ${orderType}`,
    ];
    if (customerName.trim()) {
      lines.push(`Customer: ${customerName.trim()}`);
    }
    lines.push('');
    lines.push('*Items:*');
    cart.forEach((c, idx) => {
      const lineTotal = (Number(c.dish.price || 0) * c.quantity).toFixed(0);
      lines.push(`${idx + 1}. ${c.quantity}x ${c.dish.name} — ₹${lineTotal}`);
    });
    lines.push('');
    lines.push(`*Total: ₹${subtotal.toFixed(0)}*`);
    if (customerNote.trim()) {
      lines.push(`Note: ${customerNote.trim()}`);
    }

    const url = buildWhatsAppUrl(store.whatsappLink, store.phone, lines.join('\n'));
    if (!url) {
      alert('WhatsApp link/phone is not configured in Store Settings yet.');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F9FA] flex flex-col items-center justify-center p-6 gap-3">
        <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-[#0D9488]" />
        <p className="text-xs font-medium text-slate-500">Loading menu...</p>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="min-h-screen bg-[#F7F9FA] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-sm w-full text-center space-y-2 shadow-sm">
          <UtensilsCrossed size={28} className="mx-auto text-slate-300" />
          <h1 className="text-base font-bold text-slate-800">Menu Unavailable</h1>
          <p className="text-xs text-slate-500">{error || 'Please try again in a moment.'}</p>
        </div>
      </div>
    );
  }

  const CartPanelContent = (
    <div className="flex flex-col h-full">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Your Order ({totalItems})</h2>
          <p className="text-[11px] text-slate-400">Review items &amp; send on WhatsApp</p>
        </div>
        <div className="flex items-center gap-2">
          {cart.length > 0 && (
            <button
              type="button"
              onClick={() => setCart([])}
              className="text-xs font-semibold text-rose-500 hover:text-rose-600 inline-flex items-center gap-1"
            >
              <Trash2 size={12} />
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={() => setCartModalOpen(false)}
            className="lg:hidden p-1.5 rounded-lg bg-slate-100 text-slate-600"
            aria-label="Close cart"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2.5 max-h-[38dvh] lg:max-h-none">
        {cart.length === 0 ? (
          <div className="py-10 text-center space-y-2">
            <ShoppingBag size={28} className="mx-auto text-slate-300" />
            <p className="text-xs text-slate-400">
              Select dishes from the menu to build your WhatsApp order.
            </p>
          </div>
        ) : (
          cart.map((c) => (
            <div
              key={c.dish.id}
              className="flex items-center justify-between gap-2.5 bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100"
            >
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-800 truncate">{c.dish.name}</div>
                <div className="text-[11px] text-slate-500">
                  ₹{Number(c.dish.price || 0).toFixed(0)} × {c.quantity}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => updateQty(c.dish.id, -1)}
                  className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700"
                >
                  <Minus size={11} />
                </button>
                <span className="w-4 text-center text-xs font-bold text-slate-900">{c.quantity}</span>
                <button
                  type="button"
                  onClick={() => updateQty(c.dish.id, 1)}
                  className="w-6 h-6 rounded-lg bg-[#0D9488] text-white flex items-center justify-center"
                >
                  <Plus size={11} />
                </button>
              </div>
              <div className="text-xs font-extrabold text-slate-900 w-12 text-right">
                ₹{(Number(c.dish.price || 0) * c.quantity).toFixed(0)}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Customer Details & WhatsApp CTA */}
      <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/70 space-y-3">
        {/* Order Type Pills */}
        <div className="grid grid-cols-3 gap-1.5 bg-white p-1 rounded-xl border border-slate-200">
          {(['Take Away', 'Delivery', 'Dine In'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setOrderType(t)}
              className={clsx(
                'py-1.5 rounded-lg text-[11px] font-bold transition',
                orderType === t
                  ? 'bg-[#0D9488] text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="Your name (optional)"
          className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
        />

        <input
          type="text"
          value={customerNote}
          onChange={(e) => setCustomerNote(e.target.value)}
          placeholder="Cooking note / delivery address (optional)"
          className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
        />

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs font-semibold text-slate-500">Item Total</span>
          <span className="text-lg font-extrabold text-slate-900">₹{subtotal.toFixed(0)}</span>
        </div>

        <button
          type="button"
          disabled={cart.length === 0}
          onClick={handleSendWhatsApp}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#25D366] hover:bg-[#1ebe5d] disabled:bg-slate-300 text-white text-sm font-bold shadow-md transition active:scale-[0.99]"
        >
          <MessageCircle size={18} />
          Send Order on WhatsApp
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F7F9FA] text-slate-900 pb-24 lg:pb-10">
      {/* ── Top Brand Header with Centered (Middle) Logo ── */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 pt-4 pb-3.5">
          {/* Centered Logo & Store Name */}
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-teal-50/70 border border-teal-100 shadow-sm flex items-center justify-center mb-2 p-1">
              {store.logo ? (
                <img
                  src={store.logo}
                  alt={store.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <UtensilsCrossed size={28} className="text-[#0D9488]" />
              )}
            </div>
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
              {store.name}
            </h1>
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 mt-0.5 text-[11px] sm:text-xs text-slate-500">
              {store.address && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={12} className="text-[#0D9488] flex-shrink-0" />
                  <span>{store.address}</span>
                </span>
              )}
              {store.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone size={11} className="text-slate-400 flex-shrink-0" />
                  <span>{store.phone}</span>
                </span>
              )}
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-3.5 max-w-xl mx-auto relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your food here..."
              className="w-full pl-10 pr-9 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488] focus:bg-white transition"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Main Content (Web 2-Column with Sidebar Cart, Mobile 1-Column) ── */}
      <main className="max-w-6xl mx-auto px-4 py-5 flex flex-col lg:flex-row gap-6 items-start">
        {/* Left / Main Menu Area */}
        <div className="flex-1 w-full min-w-0">
          {!showingDishes ? (
            /* ── STEP 1: Visual Categories Grid ── */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">Categories</h2>
                <button
                  type="button"
                  onClick={() => setSelectedCategory('All')}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#0D9488] hover:underline"
                >
                  View All ({dishes.length})
                  <ChevronRight size={14} />
                </button>
              </div>

              {categories.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center text-sm text-slate-400">
                  No menu items available right now.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-3.5 sm:gap-4">
                  {categories.map((cat, idx) => {
                    const tint = CATEGORY_CARD_TINTS[idx % CATEGORY_CARD_TINTS.length];
                    return (
                      <button
                        key={cat.name}
                        type="button"
                        onClick={() => setSelectedCategory(cat.name)}
                        className={clsx(
                          'group rounded-3xl p-4 sm:p-5 border text-center transition-all hover:shadow-md active:scale-[0.98] flex flex-col items-center',
                          tint
                        )}
                      >
                        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-white border-4 border-white shadow-md mb-3 flex items-center justify-center group-hover:scale-105 transition-transform">
                          {cat.image ? (
                            <img
                              src={cat.image}
                              alt={cat.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-teal-50 flex items-center justify-center">
                              <Sparkles size={28} className="text-[#0D9488]" />
                            </div>
                          )}
                        </div>
                        <div className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
                          {cat.name}
                        </div>
                        <div className="text-[11px] font-medium text-slate-500 mt-1">
                          {cat.count} {cat.count === 1 ? 'item' : 'items'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* ── STEP 2: Dishes View (Category Selected or Searching) ── */
            <div className="space-y-4">
              {/* Top Back Button + Category Pills */}
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory(null);
                    setSearch('');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 flex-shrink-0 shadow-xs"
                >
                  <ArrowLeft size={14} />
                  Categories
                </button>

                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5 flex-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      setSelectedCategory('All');
                    }}
                    className={clsx(
                      'flex-shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold border transition',
                      !isSearching && selectedCategory === 'All'
                        ? 'bg-[#0D9488] text-white border-[#0D9488]'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'
                    )}
                  >
                    All ({dishes.length})
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.name}
                      type="button"
                      onClick={() => {
                        setSearch('');
                        setSelectedCategory(cat.name);
                      }}
                      className={clsx(
                        'flex-shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold border transition',
                        !isSearching && selectedCategory === cat.name
                          ? 'bg-[#0D9488] text-white border-[#0D9488]'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'
                      )}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Section Heading */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">
                    {isSearching
                      ? `Search results for "${search.trim()}"`
                      : selectedCategory === 'All'
                      ? 'Full Menu'
                      : selectedCategory}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {visibleDishes.length} {visibleDishes.length === 1 ? 'dish' : 'dishes'} available
                  </p>
                </div>
              </div>

              {/* Dish List (1-col on mobile like reference, 2-col on md+ web) */}
              {visibleDishes.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center text-sm text-slate-400">
                  No matching dishes found.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {visibleDishes.map((dish) => {
                    const qty = getQty(dish.id);
                    return (
                      <div
                        key={dish.id}
                        className={clsx(
                          'bg-white rounded-2xl p-4 border transition flex items-center justify-between gap-3.5 shadow-xs',
                          qty > 0
                            ? 'border-[#0D9488] ring-1 ring-[#0D9488]/20'
                            : 'border-slate-100 hover:border-slate-200'
                        )}
                      >
                        {/* Left Info */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="text-[10px] font-bold uppercase tracking-wide text-teal-600">
                            {dish.category}
                          </div>
                          <h3 className="text-sm sm:text-[15px] font-bold text-slate-900 leading-snug">
                            {dish.name}
                          </h3>
                          <div className="text-sm font-extrabold text-slate-900">
                            ₹{Number(dish.price || 0).toFixed(0)}
                          </div>
                          {dish.description && (
                            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                              {dish.description}
                            </p>
                          )}
                        </div>

                        {/* Right Thumbnail + Floating ADD / Stepper */}
                        <div className="flex flex-col items-center flex-shrink-0 w-24">
                          <div className="w-24 h-20 rounded-2xl overflow-hidden bg-slate-100 border border-slate-100 flex items-center justify-center">
                            {dish.image ? (
                              <img
                                src={dish.image}
                                alt={dish.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-2xl font-extrabold text-teal-600/60">
                                {(dish.name || '?').charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>

                          <div className="-mt-3.5 z-10 w-20">
                            {qty === 0 ? (
                              <button
                                type="button"
                                onClick={() => addItem(dish)}
                                className="w-full py-1.5 rounded-xl bg-white hover:bg-teal-50 text-[#0D9488] border border-[#0D9488] text-xs font-extrabold shadow-sm transition active:scale-95 flex items-center justify-center gap-1"
                              >
                                ADD
                                <Plus size={12} />
                              </button>
                            ) : (
                              <div className="w-full py-1 px-1.5 rounded-xl bg-[#0D9488] text-white shadow-sm flex items-center justify-between">
                                <button
                                  type="button"
                                  onClick={() => updateQty(dish.id, -1)}
                                  className="w-5 h-5 rounded-md hover:bg-white/20 flex items-center justify-center"
                                  aria-label="Decrease quantity"
                                >
                                  <Minus size={12} />
                                </button>
                                <span className="text-xs font-extrabold">{qty}</span>
                                <button
                                  type="button"
                                  onClick={() => updateQty(dish.id, 1)}
                                  className="w-5 h-5 rounded-md hover:bg-white/20 flex items-center justify-center"
                                  aria-label="Increase quantity"
                                >
                                  <Plus size={12} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Desktop Web Sticky Cart Sidebar ── */}
        <aside className="hidden lg:flex lg:flex-col w-96 flex-shrink-0 bg-white rounded-3xl border border-slate-200/80 shadow-sm sticky top-40 overflow-hidden max-h-[calc(100dvh-11rem)]">
          {CartPanelContent}
        </aside>
      </main>

      {/* ── Mobile Sticky Bottom Cart Bar ── */}
      {totalItems > 0 && (
        <div className="lg:hidden fixed bottom-3 inset-x-3 z-30">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl px-4 py-3 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setCartModalOpen(true)}
              className="flex items-center gap-2.5 text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#0D9488] flex items-center justify-center">
                <ShoppingBag size={18} />
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                  {totalItems} {totalItems === 1 ? 'ITEM' : 'ITEMS'} ADDED
                </div>
                <div className="text-xs font-bold text-[#0D9488]">₹{subtotal.toFixed(0)}</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setCartModalOpen(true)}
              className="px-6 py-2.5 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-sm font-extrabold shadow-sm transition active:scale-95"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ── Mobile Cart & WhatsApp Order Bottom Sheet ── */}
      {cartModalOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="fixed inset-0 bg-slate-900/45"
            onClick={() => setCartModalOpen(false)}
          />
          <div className="relative z-10 w-full max-w-lg bg-white rounded-t-3xl shadow-2xl max-h-[88dvh] flex flex-col overflow-hidden">
            {CartPanelContent}
          </div>
        </div>
      )}
    </div>
  );
}
