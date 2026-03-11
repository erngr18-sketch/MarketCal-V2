'use client';

import { useRouter } from 'next/navigation';
import { routes } from '@/lib/routes';

export default function LoginPage() {
  const router = useRouter();

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <section className="card w-full max-w-md p-7">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">MarketcalV2</p>
          <h1 className="mt-2 text-2xl font-semibold text-accent-900">Giriş Yap</h1>
          <p className="mt-1 text-sm text-slate-600">Mock auth aktif. Devam ederek panele geçebilirsin.</p>
        </div>

        <button
          type="button"
          onClick={() => router.push(routes.dashboard)}
          className="btn btn-primary w-full"
        >
          Panele Devam Et
        </button>
      </section>
    </main>
  );
}
