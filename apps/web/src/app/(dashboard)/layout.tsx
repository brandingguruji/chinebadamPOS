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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [username, setUsername] = useState('Admin');
  const [role, setRole] = useState('Admin');
  const [brandName, setBrandName] = useState('Chinebadam');
  const [brandLogo, setBrandLogo] = useState('');
  const [lowStockCount, setLowStockCount] = useState(0);

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
    }
  }, [router]);

  function handleLogout() {
    removeToken();
    router.replace('/login');
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F7F9FA]">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-white border-r border-slate-100 flex flex-col">
        {/* Logo */}
        <div className="px-6 py-5 flex items-center gap-2.5">
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
            <div className="text-[12px] text-slate-400 font-medium">POS Station</div>
          </div>
        </div>

        {/* Main Nav */}
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
                <span className="flex-1">{label}</span>
                {href === '/stocks' && lowStockCount > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-white">
                    {lowStockCount}
                  </span>
                )}
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
      </aside>

      {/* Main Column */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-100 px-6 py-3 flex items-center justify-between gap-4 flex-shrink-0">
          <div className="relative w-80 max-w-full">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search menu, orders and more"
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition"
            />
          </div>

          <div className="flex items-center gap-4">
            <button
              aria-label="Notifications"
              className="w-9 h-9 rounded-full border border-slate-200/80 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition"
            >
              <Bell size={16} />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-teal-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                {username.charAt(0).toUpperCase()}
              </div>
              <div className="leading-tight">
                <div className="text-[13px] font-semibold text-slate-800 capitalize">{username}</div>
                <div className="text-[11px] text-slate-400 capitalize">{role}</div>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto">{children}</div>
      </main>
    </div>
  );
}
