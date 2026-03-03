'use client';

import { LayoutDashboard, BarChart3, Scale, TrendingUp } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import clsx from 'clsx';

const items = [
  { href: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/app/single', label: 'Tek Ürün Analizi', icon: BarChart3 },
  { href: '/app/compare', label: 'Karşılaştırma', icon: Scale },
  { href: '/app/competition', label: 'Rekabet Analizi', icon: TrendingUp }
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full border-b border-slate-200/60 bg-white px-4 py-6 lg:sticky lg:top-0 lg:h-screen lg:w-[280px] lg:border-b-0 lg:border-r">
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-slate-500">MARKETCAL</p>
        <p className="mt-1 text-sm font-medium text-slate-800">Admin Workspace</p>
      </div>

      <nav className="mt-5 flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-1 lg:overflow-visible lg:pb-0">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition lg:shrink',
                active
                  ? 'bg-slate-100 font-semibold text-slate-900'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 hidden lg:block">
        <span className="badge bg-slate-100 text-slate-600">v2.0</span>
      </div>
    </aside>
  );
}
