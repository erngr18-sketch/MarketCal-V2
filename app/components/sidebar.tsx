'use client';

import { LayoutDashboard, BarChart3, Scale, TrendingUp } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';

type SidebarChildItem = {
  href: string;
  label: string;
};

type SidebarItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  children?: SidebarChildItem[];
};

const items: SidebarItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/single', label: 'Tek Ürün Analizi', icon: BarChart3 },
  { href: '/compare', label: 'Karşılaştırma', icon: Scale },
  {
    href: '/competition',
    label: 'Rekabet Analizi',
    icon: TrendingUp,
    children: [
      { href: '/competition', label: 'Fiyat Konumu' },
      { href: '/competition/product', label: 'Ürün Bazlı' }
    ]
  }
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full border-b border-slate-200/60 bg-white px-4 py-6 lg:sticky lg:top-0 lg:h-screen lg:w-[280px] lg:border-b-0 lg:border-r">
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-slate-500">MARKETCAL</p>
        <p className="mt-1 text-sm font-medium text-slate-800">Admin Workspace</p>
      </div>

      <nav className="mt-5 space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isCompetitionParent = item.href === '/app/competition';
          const active = isCompetitionParent ? pathname.startsWith('/app/competition') : pathname === item.href;
          return (
            <div key={item.href}>
              <Link
                href={item.href}
                className={clsx(
                  'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition',
                  active
                    ? 'bg-slate-100 font-semibold text-slate-900'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap">{item.label}</span>
              </Link>

              {item.children ? (
                <div className="mt-1 space-y-1">
                  {item.children.map((child) => {
                    const childActive = pathname === child.href;
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={clsx(
                          'ml-6 block rounded-lg px-3 py-1.5 text-xs transition',
                          childActive
                            ? 'bg-slate-100 font-semibold text-slate-900'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        )}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>

      <div className="mt-6 hidden lg:block">
        <span className="badge bg-slate-100 text-slate-600">v2.0</span>
      </div>
    </aside>
  );
}
