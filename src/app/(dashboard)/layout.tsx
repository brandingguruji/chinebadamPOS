'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { isAuthenticated, getToken, removeToken } from '@/lib/auth';
import { getMe, getStocks } from '@/lib/api';
import { loadStoreSettings, fetchStoreSettingsFromDB, type StoreType } from '@/lib/settings';
import clsx from 'clsx';
import {
  LayoutGrid,
  ClipboardList,
  Armchair,
  UtensilsCrossed,
  Users,
  Settings,
  LogOut,
  Search,
  Bell,
  Wallet,
  BarChart3,
  Zap,
  Package,
  Menu,
  X,
  Tags,
  PartyPopper,
  ChevronDown,
} from 'lucide-react';

const PRIMARY_NAV = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutGrid },
  { label: 'Order Line', href: '/order-line', icon: ClipboardList },
  { label: 'Bulk Orders', href: '/bulk-orders', icon: PartyPopper },
  { label: 'Manage Table', href: '/manage-tables', icon: Armchair },
  { label: 'Customers', href: '/customers', icon: Users },
];

const MENU_SUB_ITEMS = [
  { label: 'Manage Dishes', href: '/manage-dishes', icon: UtensilsCrossed },
  { label: 'Categories', href: '/categories', icon: Tags },
];

const FINANCE_SUB_ITEMS = [
  { label: 'Reports', href: '/reports', icon: BarChart3 },
  { label: 'Stock Alerts', href: '/stocks', icon: Package },
  { label: 'Expenses', href: '/expenses', icon: Wallet },
];

const BOTTOM_ITEMS = [
  { label: 'Settings', href: '/settings', icon: Settings },
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
  const [storeType, setStoreType] = useState<StoreType>('big');
  const [lowStockCount, setLowStockCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const isMenuSection = MENU_SUB_ITEMS.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + '/')
  );
  const isFinanceSection = FINANCE_SUB_ITEMS.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + '/')
  );

  const [menuGroupOpen, setMenuGroupOpen] = useState(isMenuSection);
  const [financeGroupOpen, setFinanceGroupOpen] = useState(isFinanceSection);

  useEffect(() => {
    setMobileMenuOpen(false);
    setProfileMenuOpen(false);
    if (isMenuSection) setMenuGroupOpen(true);
    if (isFinanceSection) setFinanceGroupOpen(true);
  }, [pathname, isMenuSection, isFinanceSection]);

  useEffect(() => {
    const syncBrand = () => {
      try {
        const s = loadStoreSettings();
        if (s.name) setBrandName(s.name);
        setBrandLogo(s.logo || '');
        setStoreType(s.storeType);
      } catch {}
    };
    syncBrand();
    fetchStoreSettingsFromDB().then((s) => {
      if (s.name) setBrandName(s.name);
      setBrandLogo(s.logo || '');
      setStoreType(s.storeType);
    });
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

  const posActive = pathname === '/pos' || pathname.startsWith('/pos/');

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
        {/* Highlighted Quick POS CTA */}
        <Link
          href="/pos"
          className={clsx(
            'flex items-center gap-2.5 px-3.5 py-2.5 mb-2.5 rounded-xl text-[13px] font-bold transition-all shadow-sm',
            posActive
              ? 'bg-[#0F766E] text-white ring-2 ring-teal-300'
              : 'bg-[#0D9488] hover:bg-[#0F766E] text-white'
          )}
        >
          <span className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
            <Zap size={15} className="text-white" />
          </span>
          <span className="flex-1">Quick POS</span>
          <span className="text-[10px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded-md bg-white/20">
            Live
          </span>
        </Link>

        {/* Primary Items */}
        {PRIMARY_NAV.filter(({ href }) => {
          if (storeType === 'small' && (href === '/manage-tables' || href === '/order-line')) {
            return false;
          }
          return true;
        }).map(({ label, href, icon: Icon }) => {
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
            </Link>
          );
        })}

        {/* Submenu Group 1: Menu (Manage Dishes + Categories) */}
        <div className="pt-0.5">
          <button
            type="button"
            onClick={() => setMenuGroupOpen((v) => !v)}
            className={clsx(
              'w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all',
              isMenuSection
                ? 'bg-slate-100/90 text-slate-900 font-semibold'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
            )}
          >
            <UtensilsCrossed size={17} className={isMenuSection ? 'text-teal-600' : 'text-slate-400'} />
            <span className="flex-1 text-left">Menu</span>
            <ChevronDown
              size={15}
              className={clsx('text-slate-400 transition-transform duration-200', menuGroupOpen && 'rotate-180')}
            />
          </button>

          {menuGroupOpen && (
            <div className="mt-1 ml-4 pl-3 border-l border-slate-200 space-y-1">
              {MENU_SUB_ITEMS.map(({ label, href, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(href + '/');
                return (
                  <Link
                    key={href}
                    href={href}
                    className={clsx(
                      'flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12.5px] font-medium transition-all',
                      active
                        ? 'bg-[#E6F4F1] text-[#0F766E] font-semibold'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                    )}
                  >
                    <Icon size={15} className={active ? 'text-[#0D9488]' : 'text-slate-400'} />
                    <span className="flex-1">{label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Submenu Group 2: Accounts & Stock (Reports + Stock Alerts + Expenses) */}
        <div className="pt-0.5">
          <button
            type="button"
            onClick={() => setFinanceGroupOpen((v) => !v)}
            className={clsx(
              'w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all',
              isFinanceSection
                ? 'bg-slate-100/90 text-slate-900 font-semibold'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
            )}
          >
            <BarChart3 size={17} className={isFinanceSection ? 'text-teal-600' : 'text-slate-400'} />
            <span className="flex-1 text-left">Accounts &amp; Stock</span>
            {!financeGroupOpen && lowStockCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-white">
                {lowStockCount}
              </span>
            )}
            <ChevronDown
              size={15}
              className={clsx('text-slate-400 transition-transform duration-200', financeGroupOpen && 'rotate-180')}
            />
          </button>

          {financeGroupOpen && (
            <div className="mt-1 ml-4 pl-3 border-l border-slate-200 space-y-1">
              {FINANCE_SUB_ITEMS.map(({ label, href, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(href + '/');
                return (
                  <Link
                    key={href}
                    href={href}
                    className={clsx(
                      'flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12.5px] font-medium transition-all',
                      active
                        ? 'bg-[#E6F4F1] text-[#0F766E] font-semibold'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                    )}
                  >
                    <Icon size={15} className={active ? 'text-[#0D9488]' : 'text-slate-400'} />
                    <span className="flex-1">{label}</span>
                    {href === '/stocks' && lowStockCount > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-white">
                        {lowStockCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

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
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileMenuOpen((v) => !v)}
                className="flex items-center gap-2 hover:bg-slate-50 px-1.5 py-1 rounded-xl transition"
                aria-label="Account menu"
              >
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-teal-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                  {username.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block leading-tight text-left">
                  <div className="text-[13px] font-semibold text-slate-800 capitalize">{username}</div>
                  <div className="text-[11px] text-slate-400 capitalize">{role}</div>
                </div>
              </button>

              {profileMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setProfileMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-50">
                    <div className="px-3.5 py-2 border-b border-slate-100">
                      <div className="text-xs font-bold text-slate-800 capitalize truncate">{username}</div>
                      <div className="text-[11px] text-slate-400 capitalize">{role}</div>
                    </div>
                    <Link
                      href="/settings"
                      className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Settings size={15} className="text-slate-400" />
                      Settings &amp; Profile
                    </Link>
                    <div className="my-1 border-t border-slate-100" />
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
                    >
                      <LogOut size={15} />
                      Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page Content (extra bottom padding on mobile for bottom tab bar) */}
        <div className="flex-1 overflow-auto pb-16 md:pb-0">{children}</div>

        {/* Mobile Bottom Navigation Bar */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 px-2 py-1.5 flex items-center justify-around">
          {(storeType === 'small'
            ? [
                { label: 'POS', href: '/pos', icon: Zap },
                { label: 'Dashboard', href: '/dashboard', icon: LayoutGrid },
                { label: 'Expenses', href: '/expenses', icon: Wallet },
                { label: 'Reports', href: '/reports', icon: BarChart3 },
              ]
            : MOBILE_TABS
          ).map(({ label, href, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            const isPos = href === '/pos';
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  'flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[10px] font-semibold transition',
                  isPos
                    ? 'bg-[#0D9488] text-white shadow-sm'
                    : active
                    ? 'text-[#0D9488]'
                    : 'text-slate-400'
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
