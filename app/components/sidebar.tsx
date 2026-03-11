'use client';

import { Calculator, ChartLine, LayoutDashboard, Package, Scale, Settings, Target } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';

type SidebarChildItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

type SidebarItem = {
  href?: string;
  label: string;
  icon: LucideIcon;
  children?: SidebarChildItem[];
  disabled?: boolean;
};

type SidebarGroup = {
  label?: string;
  icon?: LucideIcon;
  items: SidebarItem[];
};

const groups: SidebarGroup[] = [
  {
    items: [{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }]
  },
  {
    label: 'Analizler',
    icon: ChartLine,
    items: [
      { href: '/single', label: 'Kâr Senaryosu', icon: Calculator },
      { href: '/compare', label: 'Pazaryeri Karşılaştırma', icon: Scale },
      { href: '/competition', label: 'Rekabet Analizi', icon: ChartLine },
      { href: '/competition/product', label: 'Fiyat Konumu', icon: Target }
    ]
  },
  {
    items: [{ label: 'Ürünler', icon: Package, disabled: true }]
  },
  {
    items: [{ label: 'Ayarlar', icon: Settings, disabled: true }]
  }
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-full flex-col border-b border-slate-200/60 bg-white px-4 py-6 lg:sticky lg:top-0 lg:h-screen lg:w-[280px] lg:border-b-0 lg:border-r">
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-slate-500">MARKETCAL</p>
        <p className="mt-1 text-sm font-medium text-slate-800">Admin Workspace</p>
      </div>

      <nav className="mt-5 flex-1 space-y-4">
        {groups.map((group, groupIndex) => (
          <div key={group.label ?? `group-${groupIndex}`} className="space-y-1">
            {group.label ? (
              <div className="flex items-center gap-2 px-3 text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
                {group.icon ? <group.icon className="h-3.5 w-3.5 shrink-0" /> : null}
                <span>{group.label}</span>
              </div>
            ) : null}

            {group.items.map((item) => {
              const Icon = item.icon;
              const active = item.href ? pathname === item.href : false;

              if (item.disabled || !item.href) {
                return (
                  <div key={item.label} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-slate-400">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="whitespace-nowrap">{item.label}</span>
                  </div>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    group.label
                      ? 'ml-5 flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition'
                      : 'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition',
                    active
                      ? 'bg-slate-100 font-semibold text-slate-900'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  )}
                >
                  {group.label ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current/60" /> : <Icon className="h-4 w-4 shrink-0" />}
                  <span className="whitespace-nowrap">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="mt-6 hidden justify-center lg:flex">
        <span className="badge bg-slate-100 text-slate-600">v2.0</span>
      </div>
    </aside>
  );
}
