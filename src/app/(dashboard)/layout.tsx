'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { isAuthenticated, getToken, removeToken } from '@/lib/auth';
import { getMe, getStocks } from '@/lib/api';
import clsx from 'clsx';
import {
  LayoutGrid,
  ClipboardList,
  Armchair,
  UtensilsCrossed,
  Users,
  Settings,
  HelpCircle,
  LogOut,
  Search,
  Bell,
  Wallet,
  BarChart3,
  Zap,
  Package,
  Menu,
  X,
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Quick POS', href: '/pos', icon: Zap },
  { label: 'Dashboard', href: '/dashboard', icon: LayoutGrid },
  { label: 'Order Line', href: '/order-line', icon: ClipboardList },
  { label: 'Manage Table', href: '/manage-tables', icon: Armchair },
  { label: 'Manage Dishes', href: '/manage-dishes', icon: UtensilsCrossed },
  { label: 'Customers', href: '/customers', icon: Users },
  { label: 'Expenses', href: '/expenses', icon: Wallet },
  { label: 'Stock Alerts', href: '/stocks', icon: Package },
  { label: 'Reports', href: '/reports', icon: BarChart3 },
];

const BOTTOM_ITEMS = [
  { label: 'Settings', href: '/settings', icon: Settings },
  { label: 'Help Center', href: '/help', icon: HelpCircle },
];

const MOBILE_TABS = [
  { label: 'POS', href: '/pos', icon: Zap },
  { label: 'Orders', href: '/order-line', icon: ClipboardList },
  { label: 'Dashboard', href: '/dashboard', icon: LayoutGrid },
  { label: 'Expenses', href: '/expenses', icon: Wallet },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [username, setUsername] = useState('Admin');
  const [role, setRole] = useState('Admin');
  const [brandName, setBrandName] = useState('Chinebadam');
  const [brandLogo, setBrandLogo] = useState('');
  const [lowStockCount, setLowStockCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const syncBrand = () => {
      try {
        const raw = localStorage.getItem('chinebadam_pos_settings');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.name) setBrandName(parsed.name);
          setBrandLogo(parsed.logo || '');
        }
      } catch {}
    };
    syncBrand();
    window.addEventListener('pos-settings-updated', syncBrand);
    return () => window.removeEventListener('pos-settings-updated', syncBrand);
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }
    const token = getToken();
    if (token) {
      const fetchAlerts = () => {
        getStocks(token)
          .then((list) => setLowStockCount(list.filter((s) => s.quantity <= s.minThreshold).length))
          .catch(() => {});
      };
      fetchAlerts();
      window.addEventListener('pos-stocks-updated', fetchAlerts);
      getMe(token)
        .then((u) => {
          setUsername(u.username);
          setRole(u.role);
        })
        .catch(() => {
          removeToken();
          router.replace('/login');
        });
      return () => window.removeEventListener('pos-stocks-updated', fetchAlerts);
    }
  }, [router]);

  function handleLogout() {
    removeToken();
    router.replace('/login');
  }

  const NavContent = () => (
    <>
      <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100 md:border-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-teal-600/10 flex items-center justify-center overflow-hidden flex-shrink-0">
            {brandLogo ? (
              <img src={brandLogo} alt={brandName} className="w-full h-full object-contain p-0.5" />
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M5 13L12 4L19 13H5Z" fill="#0D9488" />
                <path d="M8 15L12 20L16 15H8Z" fill="#14B8A6" />
              </svg>
            )}
          </div>
          <div className="leading-tight min-w-0">
            <div className="text-[15px] font-bold text-slate-800 tracking-tight truncate">{brandName}</div>
            <div className="text-[11px] text-slate-400 font-medium">POS Station</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          className="md:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
          aria-label="Close menu"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all',
                active
                  ? 'bg-slate-100/90 text-slate-900 font-semibold'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              )}
            >
              <Icon size={17} className={active ? 'text-teal-600' : 'text-slate-400'} />
              <span className="flex-1">{label}</span>
              {href === '/stocks' && lowStockCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-white">
                  {lowStockCount}
                </span>
              )}
            </Link>
          );
        })}

        <div className="my-3 border-t border-slate-100" />

        {BOTTOM_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all',
                active
                  ? 'bg-slate-100/90 text-slate-900 font-semibold'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              )}
            >
              <Icon size={17} className={active ? 'text-teal-600' : 'text-slate-400'} />
              {label}
            </Link>
          );
        })}

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut size={17} className="text-slate-400" />
          Logout
        </button>
      </nav>
    </>
  );

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[#F7F9FA]">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-56 flex-shrink-0 bg-white border-r border-slate-100 flex-col">
        <NavContent />
      </aside>

      {/* Mobile Slide-over Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-64 max-w-[80vw] bg-white h-full flex flex-col shadow-2xl z-10">
            <NavContent />
          </aside>
        </div>
      )}

      {/* Main Column */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-100 px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>
            <div className="md:hidden font-bold text-sm text-slate-800 truncate">{brandName}</div>
            <div className="hidden md:block relative w-72 lg:w-80">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search menu, orders and more"
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition"
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-4 flex-shrink-0">
            <Link
              href="/stocks"
              aria-label="Stock Alerts"
              className="relative w-9 h-9 rounded-full border border-slate-200/80 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition"
            >
              <Bell size={16} />
              {lowStockCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {lowStockCount}
                </span>
              )}
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-teal-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                {username.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block leading-tight">
                <div className="text-[13px] font-semibold text-slate-800 capitalize">{username}</div>
                <div className="text-[11px] text-slate-400 capitalize">{role}</div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content (extra bottom padding on mobile for bottom tab bar) */}
        <div className="flex-1 overflow-auto pb-16 md:pb-0">{children}</div>

        {/* Mobile Bottom Navigation Bar */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 px-2 py-1.5 flex items-center justify-around">
          {MOBILE_TABS.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  'flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[10px] font-semibold transition',
                  active ? 'text-[#0D9488]' : 'text-slate-400'
                )}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[10px] font-semibold text-slate-400 relative"
          >
            <Menu size={18} />
            More
            {lowStockCount > 0 && (
              <span className="absolute top-0.5 right-2 w-2 h-2 rounded-full bg-rose-500" />
            )}
          </button>
        </nav>
      </main>
    </div>
  );
}
