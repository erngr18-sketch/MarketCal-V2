import { MarketplaceSettings } from '@/app/components/settings/marketplace-settings';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold text-slate-900">Ayarlar</h1>
        <p className="mt-1 text-sm text-slate-600">Pazaryeri entegrasyonlarını yönetin.</p>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">Ayarlar</span>
          <span className="text-slate-400">/</span>
          <span className="rounded-full bg-indigo-50 px-3 py-1 font-semibold text-indigo-700">Pazaryer Ekle</span>
        </div>
      </section>

      <MarketplaceSettings />
    </div>
  );
}
