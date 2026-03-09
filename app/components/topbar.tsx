'use client';

import { Bell } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

const titleMap: Record<string, string> = {
  '/app/dashboard': 'Dashboard',
  '/app/single': 'Tek Ürün Analizi',
  '/app/compare': 'Karşılaştırma',
  '/app/competition': 'Rekabet Analizi',
  '/app/competition/product': 'Rekabet Analizi',
  '/app/settings': 'Ayarlar'
};

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();

  const title = pathname.startsWith('/app/competition')
    ? 'Rekabet Analizi'
    : pathname.startsWith('/app/settings')
      ? 'Ayarlar'
      : (titleMap[pathname] ?? 'Panel');

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/60 bg-white">
      <div className="layout-shell mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between px-6 lg:px-8">
        <h1 className="text-base font-semibold text-slate-900">{title}</h1>

        <div className="flex items-center gap-2">
          <button type="button" className="btn btn-secondary h-9 w-9 p-0" aria-label="Bildirimler">
            <Bell className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">Mock User</span>
            <button type="button" onClick={() => router.push('/login')} className="btn btn-ghost h-9 px-3 text-sm">
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
