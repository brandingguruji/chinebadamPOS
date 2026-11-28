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
  Clock,
  ExternalLink,
  Flame,
} from 'lucide-react';

interface PublicStore {
  name: string;
  logo: string;
  address: string;
  phone: string;
  whatsappLink: string;
  openingHours?: string;
  availableOnZomato?: boolean;
  zomatoLink?: string;
  availableOnSwiggy?: boolean;
  swiggyLink?: string;
  availableOnOwnlly?: boolean;
  ownllyLink?: string;
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

const HERO_TAGLINES = [
  { prefix: 'Oh so', word: 'Juicy!', color: 'text-amber-300' },
  { prefix: 'Oh so', word: 'Spicy!', color: 'text-rose-300' },
  { prefix: 'Oh so', word: 'Crispy!', color: 'text-yellow-300' },
  { prefix: 'Oh so', word: 'Tasty!', color: 'text-lime-300' },
];

const FLOATING_FOODS = [
  { emoji: '🍔', pos: 'top-4 left-[6%]', size: 'text-3xl sm:text-5xl', anim: 'animate-float-slow', blur: 'blur-[0.5px]' },
  { emoji: '🍟', pos: 'bottom-6 left-[12%]', size: 'text-2xl sm:text-4xl', anim: 'animate-float-reverse', blur: '' },
  { emoji: '🌶️', pos: 'top-1/2 left-[3%]', size: 'text-2xl sm:text-3xl', anim: 'animate-float-slow', blur: 'blur-[1px]' },
  { emoji: '🍕', pos: 'top-5 right-[7%]', size: 'text-3xl sm:text-5xl', anim: 'animate-float-reverse', blur: 'blur-[0.5px]' },
  { emoji: '🥟', pos: 'bottom-7 right-[11%]', size: 'text-2xl sm:text-4xl', anim: 'animate-float-slow', blur: '' },
  { emoji: '🍜', pos: 'top-1/2 right-[3%]', size: 'text-2xl sm:text-4xl', anim: 'animate-float-reverse', blur: 'blur-[1px]' },
  { emoji: '🍅', pos: 'top-2 left-[26%] hidden md:block', size: 'text-2xl', anim: 'animate-float-reverse', blur: 'blur-[1px] opacity-80' },
  { emoji: '🍗', pos: 'top-3 right-[25%] hidden md:block', size: 'text-3xl', anim: 'animate-float-slow', blur: 'opacity-90' },
];

const CATEGORY_CARD_TINTS = [
  'bg-gradient-to-br from-amber-50 to-orange-100/70 border-amber-200/80',
  'bg-gradient-to-br from-emerald-50 to-teal-100/70 border-teal-200/80',
  'bg-gradient-to-br from-rose-50 to-pink-100/70 border-rose-200/80',
  'bg-gradient-to-br from-indigo-50 to-violet-100/70 border-indigo-200/80',
  'bg-gradient-to-br from-lime-50 to-emerald-100/70 border-lime-200/80',
  'bg-gradient-to-br from-yellow-50 to-amber-100/70 border-yellow-200/80',
];

function getFoodEmoji(name: string, category = ''): string {
  const s = `${name} ${category}`.toLowerCase();
  if (s.includes('momo') || s.includes('dumpling')) return '🥟';
  if (s.includes('burger')) return '🍔';
  if (s.includes('sandwich')) return '🥪';
  if (s.includes('pizza')) return '🍕';
  if (s.includes('noodle') || s.includes('chow') || s.includes('maggi') || s.includes('pasta')) return '🍜';
  if (s.includes('rice') || s.includes('biryani')) return '🍛';
  if (s.includes('chicken') || s.includes('pakoda') || s.includes('wing') || s.includes('lollipop')) return '🍗';
  if (s.includes('tea') || s.includes('chai') || s.includes('coffee')) return '☕';
  if (s.includes('shake') || s.includes('mojito') || s.includes('drink') || s.includes('beverage') || s.includes('cola')) return '🥤';
  if (s.includes('fries') || s.includes('potato')) return '🍟';
  if (s.includes('dessert') || s.includes('cake') || s.includes('sweet') || s.includes('brownie')) return '🍰';
  if (s.includes('soup')) return '🍲';
  if (s.includes('roti') || s.includes('paratha') || s.includes('roll')) return '🌯';
  return '🍽️';
}

function buildWhatsAppUrl(whatsappLink: string, fallbackPhone: string, message: string): string | null {
  const raw = (whatsappLink || '').trim() || (fallbackPhone || '').trim();
  if (!raw) return null;

  const encoded = encodeURIComponent(message);

  if (/^https?:\/\//i.test(raw)) {
    const separator = raw.includes('?') ? '&' : '?';
    return `${raw}${separator}text=${encoded}`;
  }

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
  const [taglineIdx, setTaglineIdx] = useState(0);

  // Customer order details for WhatsApp message
  const [customerName, setCustomerName] = useState('');
  const [orderType, setOrderType] = useState<'Take Away' | 'Delivery' | 'Dine In'>('Take Away');
  const [customerNote, setCustomerNote] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      setTaglineIdx((prev) => (prev + 1) % HERO_TAGLINES.length);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

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
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-800 to-green-900 flex flex-col items-center justify-center p-6 gap-3 text-white">
        <div className="text-4xl animate-bounce">🍔</div>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-300" />
        <p className="text-xs font-semibold tracking-wide text-emerald-100">Preparing delicious menu...</p>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="min-h-screen bg-[#FFFDF7] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-sm w-full text-center space-y-2 shadow-sm">
          <UtensilsCrossed size={28} className="mx-auto text-slate-300" />
          <h1 className="text-base font-bold text-slate-800">Menu Unavailable</h1>
          <p className="text-xs text-slate-500">{error || 'Please try again in a moment.'}</p>
        </div>
      </div>
    );
  }

  const activeTagline = HERO_TAGLINES[taglineIdx];
  const hasDeliveryPlatforms =
    store.availableOnZomato || store.availableOnSwiggy || store.availableOnOwnlly;

  const CartPanelContent = (
    <div className="flex flex-col h-full">
      <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-amber-50/60 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-extrabold text-slate-900">Your Order ({totalItems})</h2>
          <p className="text-[11px] text-slate-500">Review items &amp; send on WhatsApp</p>
        </div>
        <div className="flex items-center gap-2">
          {cart.length > 0 && (
            <button
              type="button"
              onClick={() => setCart([])}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1"
            >
              <Trash2 size={12} />
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={() => setCartModalOpen(false)}
            className="lg:hidden p-1.5 rounded-lg bg-white text-slate-600 shadow-xs"
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
            <div className="text-3xl">🛒</div>
            <p className="text-xs text-slate-400">
              Tap <strong className="text-emerald-700">ADD +</strong> on any dish to build your WhatsApp order.
            </p>
          </div>
        ) : (
          cart.map((c) => (
            <div
              key={c.dish.id}
              className="flex items-center justify-between gap-2.5 bg-amber-50/40 rounded-xl px-3 py-2.5 border border-amber-100"
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
                  className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center"
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
      <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/80 space-y-3">
        <div className="grid grid-cols-3 gap-1.5 bg-white p-1 rounded-xl border border-slate-200">
          {(['Take Away', 'Delivery', 'Dine In'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setOrderType(t)}
              className={clsx(
                'py-1.5 rounded-lg text-[11px] font-bold transition',
                orderType === t
                  ? 'bg-emerald-600 text-white shadow-xs'
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
          className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />

        <input
          type="text"
          value={customerNote}
          onChange={(e) => setCustomerNote(e.target.value)}
          placeholder="Cooking note / delivery address (optional)"
          className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs font-semibold text-slate-500">Item Total</span>
          <span className="text-lg font-extrabold text-slate-900">₹{subtotal.toFixed(0)}</span>
        </div>

        <button
          type="button"
          disabled={cart.length === 0}
          onClick={handleSendWhatsApp}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#25D366] hover:bg-[#1ebe5d] disabled:bg-slate-300 text-white text-sm font-extrabold shadow-md transition active:scale-[0.99]"
        >
          <MessageCircle size={18} />
          Send Order on WhatsApp
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFDF7] text-slate-900">
      {/* ── Animated Sunburst Hero Banner with Floating Food & Centered Logo ── */}
      <header className="relative overflow-hidden bg-gradient-to-br from-[#14532d] via-[#15803d] to-[#0f766e] text-white">
        {/* Rotating Sunburst Rays */}
        <div className="pointer-events-none absolute top-1/2 left-1/2 w-[1400px] h-[1400px] menu-sunburst-bg animate-spin-sunburst opacity-80" />
        {/* Soft Center Glow */}
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-amber-300/20 blur-3xl" />

        {/* Floating Food Elements */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden select-none">
          {FLOATING_FOODS.map((f, i) => (
            <span
              key={i}
              className={clsx(
                'absolute drop-shadow-lg',
                f.pos,
                f.size,
                f.anim,
                f.blur
              )}
              style={{ animationDelay: `${i * 0.45}s` }}
              aria-hidden="true"
            >
              {f.emoji}
            </span>
          ))}
        </div>

        {/* Hero Foreground Content */}
        <div className="relative z-10 max-w-6xl mx-auto px-4 pt-6 pb-8 sm:pt-8 sm:pb-10">
          <div className="flex flex-col items-center text-center">
            {/* Animated Promo Tagline */}
            <div
              key={taglineIdx}
              className="animate-tagline-pop inline-flex items-baseline gap-1.5 mb-2.5 px-3.5 py-1 rounded-full bg-black/20 backdrop-blur-xs border border-white/15"
            >
              <span className="text-xs sm:text-sm italic font-medium text-white/90">
                {activeTagline.prefix}
              </span>
              <span className={clsx('text-sm sm:text-base font-black tracking-wide uppercase', activeTagline.color)}>
                {activeTagline.word}
              </span>
            </div>

            {/* Centered Middle Logo */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl overflow-hidden bg-white border-4 border-amber-300/80 shadow-2xl flex items-center justify-center mb-3 p-1.5">
              {store.logo ? (
                <img
                  src={store.logo}
                  alt={store.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <UtensilsCrossed size={32} className="text-emerald-700" />
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-sm">
              {store.name}
            </h1>

            {/* Store Address, Phone & Opening Hours */}
            <div className="flex flex-wrap items-center justify-center gap-x-3.5 gap-y-1.5 mt-2 text-xs text-emerald-50/95">
              {store.address && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={13} className="text-amber-300 flex-shrink-0" />
                  <span>{store.address}</span>
                </span>
              )}
              {store.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone size={12} className="text-amber-300 flex-shrink-0" />
                  <span>{store.phone}</span>
                </span>
              )}
              {store.openingHours && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/15 border border-white/20 font-semibold text-amber-200">
                  <Clock size={12} className="flex-shrink-0" />
                  <span>{store.openingHours}</span>
                </span>
              )}
            </div>

            {/* Also Available On Pills (Zomato / Swiggy / Ownlly) */}
            {hasDeliveryPlatforms && (
              <div className="flex flex-wrap items-center justify-center gap-2 mt-3.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-100/90">
                  We are also available on:
                </span>
                {store.availableOnZomato &&
                  (store.zomatoLink ? (
                    <a
                      href={store.zomatoLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#E23744] hover:bg-[#c82b37] text-white text-xs font-extrabold shadow-sm transition"
                    >
                      Zomato
                      <ExternalLink size={11} />
                    </a>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#E23744] text-white text-xs font-extrabold shadow-sm">
                      Zomato
                    </span>
                  ))}
                {store.availableOnSwiggy &&
                  (store.swiggyLink ? (
                    <a
                      href={store.swiggyLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#FC8019] hover:bg-[#e56d0b] text-white text-xs font-extrabold shadow-sm transition"
                    >
                      Swiggy
                      <ExternalLink size={11} />
                    </a>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#FC8019] text-white text-xs font-extrabold shadow-sm">
                      Swiggy
                    </span>
                  ))}
                {store.availableOnOwnlly &&
                  (store.ownllyLink ? (
                    <a
                      href={store.ownllyLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-sm transition"
                    >
                      Ownlly
                      <ExternalLink size={11} />
                    </a>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-600 text-white text-xs font-extrabold shadow-sm">
                      Ownlly
                    </span>
                  ))}
              </div>
            )}

            {/* Search Bar */}
            <div className="mt-5 w-full max-w-xl relative">
              <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search your favourite food here..."
                className="w-full pl-11 pr-10 py-3 text-sm text-slate-900 bg-white rounded-2xl shadow-lg border-2 border-white/60 focus:outline-none focus:ring-2 focus:ring-amber-300 transition"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  aria-label="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Content (Web 2-Column with Sticky Cart, Mobile 1-Column) ── */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6 items-start">
        <div className="flex-1 w-full min-w-0">
          {!showingDishes ? (
            /* ── STEP 1: Colorful Categories Grid ── */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame size={20} className="text-orange-500" />
                  <h2 className="text-xl font-black text-slate-900">Explore Categories</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCategory('All')}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-xs font-bold text-emerald-800 transition"
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
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 sm:gap-4">
                  {categories.map((cat, idx) => {
                    const tint = CATEGORY_CARD_TINTS[idx % CATEGORY_CARD_TINTS.length];
                    return (
                      <button
                        key={cat.name}
                        type="button"
                        onClick={() => setSelectedCategory(cat.name)}
                        className={clsx(
                          'group rounded-3xl p-4 sm:p-5 border text-center transition-all hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] flex flex-col items-center',
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
                            <span className="text-4xl sm:text-5xl">
                              {getFoodEmoji(cat.name, cat.name)}
                            </span>
                          )}
                        </div>
                        <div className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
                          {cat.name}
                        </div>
                        <div className="text-[11px] font-semibold text-slate-600 mt-1 px-2.5 py-0.5 rounded-full bg-white/70">
                          {cat.count} {cat.count === 1 ? 'item' : 'items'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* ── STEP 2: Dishes View ── */
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory(null);
                    setSearch('');
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-amber-50 flex-shrink-0 shadow-xs"
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
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
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
                          ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
                      )}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    {isSearching
                      ? `Search results for "${search.trim()}"`
                      : selectedCategory === 'All'
                      ? 'Full Menu'
                      : selectedCategory}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {visibleDishes.length} {visibleDishes.length === 1 ? 'dish' : 'dishes'} available
                  </p>
                </div>
              </div>

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
                          'bg-white rounded-2xl p-4 border transition flex items-center justify-between gap-3.5 shadow-xs hover:shadow-md',
                          qty > 0
                            ? 'border-emerald-600 ring-2 ring-emerald-500/20 bg-emerald-50/20'
                            : 'border-amber-100/90 hover:border-emerald-300'
                        )}
                      >
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                            {dish.category}
                          </div>
                          <h3 className="text-sm sm:text-[15px] font-extrabold text-slate-900 leading-snug">
                            {dish.name}
                          </h3>
                          <div className="text-sm font-black text-amber-700">
                            ₹{Number(dish.price || 0).toFixed(0)}
                          </div>
                          {dish.description && (
                            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                              {dish.description}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col items-center flex-shrink-0 w-24">
                          <div className="w-24 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-amber-50 to-emerald-50 border border-amber-100 flex items-center justify-center">
                            {dish.image ? (
                              <img
                                src={dish.image}
                                alt={dish.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-3xl">
                                {getFoodEmoji(dish.name, dish.category)}
                              </span>
                            )}
                          </div>

                          <div className="-mt-3.5 z-10 w-20">
                            {qty === 0 ? (
                              <button
                                type="button"
                                onClick={() => addItem(dish)}
                                className="w-full py-1.5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-700 border-2 border-emerald-600 text-xs font-extrabold shadow-sm transition active:scale-95 flex items-center justify-center gap-1"
                              >
                                ADD
                                <Plus size={12} />
                              </button>
                            ) : (
                              <div className="w-full py-1 px-1.5 rounded-xl bg-emerald-600 text-white shadow-sm flex items-center justify-between">
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
        <aside className="hidden lg:flex lg:flex-col w-96 flex-shrink-0 bg-white rounded-3xl border border-amber-200/70 shadow-md sticky top-6 overflow-hidden max-h-[calc(100dvh-3rem)]">
          {CartPanelContent}
        </aside>
      </main>

      {/* ── Vibrant Footer with Delivery Partners & Store Info ── */}
      <footer className="mt-10 bg-gradient-to-br from-[#0f2e22] via-[#134e4a] to-[#0f172a] text-white pb-24 lg:pb-8">
        <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {/* Brand Column */}
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white p-1 flex items-center justify-center flex-shrink-0 shadow-md">
              {store.logo ? (
                <img src={store.logo} alt={store.name} className="w-full h-full object-contain" />
              ) : (
                <UtensilsCrossed size={22} className="text-emerald-700" />
              )}
            </div>
            <div>
              <div className="text-base font-extrabold text-white">{store.name}</div>
              {store.address && (
                <p className="text-xs text-emerald-100/80 mt-1 leading-relaxed">{store.address}</p>
              )}
              {store.openingHours && (
                <div className="inline-flex items-center gap-1 text-xs font-semibold text-amber-300 mt-1.5">
                  <Clock size={12} />
                  {store.openingHours}
                </div>
              )}
            </div>
          </div>

          {/* Delivery Partners Column */}
          <div className="space-y-2.5">
            <div className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
              We Are Also Available On
            </div>
            {hasDeliveryPlatforms ? (
              <div className="flex flex-wrap gap-2">
                {store.availableOnZomato && (
                  <a
                    href={store.zomatoLink || '#'}
                    target={store.zomatoLink ? '_blank' : undefined}
                    rel={store.zomatoLink ? 'noopener noreferrer' : undefined}
                    onClick={(e) => !store.zomatoLink && e.preventDefault()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#E23744] hover:bg-[#c82b37] text-white text-xs font-extrabold shadow-sm transition"
                  >
                    Zomato
                    {store.zomatoLink && <ExternalLink size={12} />}
                  </a>
                )}
                {store.availableOnSwiggy && (
                  <a
                    href={store.swiggyLink || '#'}
                    target={store.swiggyLink ? '_blank' : undefined}
                    rel={store.swiggyLink ? 'noopener noreferrer' : undefined}
                    onClick={(e) => !store.swiggyLink && e.preventDefault()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FC8019] hover:bg-[#e56d0b] text-white text-xs font-extrabold shadow-sm transition"
                  >
                    Swiggy
                    {store.swiggyLink && <ExternalLink size={12} />}
                  </a>
                )}
                {store.availableOnOwnlly && (
                  <a
                    href={store.ownllyLink || '#'}
                    target={store.ownllyLink ? '_blank' : undefined}
                    rel={store.ownllyLink ? 'noopener noreferrer' : undefined}
                    onClick={(e) => !store.ownllyLink && e.preventDefault()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-sm transition"
                  >
                    Ownlly
                    {store.ownllyLink && <ExternalLink size={12} />}
                  </a>
                )}
              </div>
            ) : (
              <p className="text-xs text-emerald-100/70">
                Direct counter takeaway &amp; WhatsApp ordering available!
              </p>
            )}
          </div>

          {/* Direct Contact Column */}
          <div className="space-y-2.5">
            <div className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
              Quick Contact
            </div>
            <div className="flex flex-wrap gap-2">
              {store.phone && (
                <a
                  href={`tel:${store.phone}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold text-white transition"
                >
                  <Phone size={13} />
                  Call {store.phone}
                </a>
              )}
              {(store.whatsappLink || store.phone) && (
                <a
                  href={buildWhatsAppUrl(store.whatsappLink, store.phone, `Hi ${store.name}, I would like to order!`) || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#25D366] hover:bg-[#1ebe5d] text-xs font-extrabold text-white shadow-sm transition"
                >
                  <MessageCircle size={14} />
                  WhatsApp Us
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="max-w-6xl mx-auto px-4 py-3.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-emerald-100/70">
            <span>© {new Date().getFullYear()} {store.name}. All rights reserved.</span>
            <span>Freshly prepared · Order directly on WhatsApp</span>
          </div>
        </div>
      </footer>

      {/* ── Mobile Sticky Bottom Cart Bar ── */}
      {totalItems > 0 && (
        <div className="lg:hidden fixed bottom-3 inset-x-3 z-30">
          <div className="bg-white rounded-2xl border-2 border-emerald-600 shadow-2xl px-4 py-3 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setCartModalOpen(true)}
              className="flex items-center gap-2.5 text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <ShoppingBag size={18} />
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                  {totalItems} {totalItems === 1 ? 'ITEM' : 'ITEMS'} ADDED
                </div>
                <div className="text-xs font-bold text-emerald-700">₹{subtotal.toFixed(0)}</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setCartModalOpen(true)}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-extrabold shadow-sm transition active:scale-95"
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
            className="fixed inset-0 bg-slate-900/50"
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
