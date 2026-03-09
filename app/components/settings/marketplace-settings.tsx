'use client';

import { useMemo, useState, useSyncExternalStore } from 'react';
import { AlertCircle, CheckCircle, Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  deleteMarketplaceRecord,
  getMarketplaceRecords,
  saveMarketplaceRecord,
  subscribeMarketplaceStore,
  toggleMarketplaceActive,
  type MarketplaceKey,
  type MarketplaceRecord
} from '@/app/components/settings/marketplace-store';

type FormState = {
  id?: string;
  marketplace: MarketplaceKey | '';
  supplierId: string;
  apiKey: string;
  secretKey: string;
};

const MARKETPLACE_OPTIONS: Array<{ value: MarketplaceKey; label: string; enabled: boolean }> = [
  { value: 'trendyol', label: 'Trendyol', enabled: true },
  { value: 'hepsiburada', label: 'Hepsiburada', enabled: true },
  { value: 'amazon', label: 'Amazon', enabled: true },
  { value: 'n11', label: 'N11', enabled: false },
  { value: 'ciceksepeti', label: 'Çiçeksepeti', enabled: false },
  { value: 'etsy', label: 'Etsy', enabled: false },
  { value: 'temu', label: 'Temu', enabled: false }
];

const INITIAL_FORM: FormState = {
  marketplace: '',
  supplierId: '',
  apiKey: '',
  secretKey: ''
};

export function MarketplaceSettings() {
  // MVP: Bu ekran yalnızca UI mock'tur. Gerçek projede credentials server-side encrypted saklanmalıdır.
  const rows = useSyncExternalStore(subscribeMarketplaceStore, getMarketplaceRecords, getMarketplaceRecords);
  const [formOpen, setFormOpen] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  const selectedOption = useMemo(
    () => MARKETPLACE_OPTIONS.find((option) => option.value === form.marketplace),
    [form.marketplace]
  );

  const supplierValid = /^\d+$/.test(form.supplierId);
  const apiKeyValid = form.apiKey.trim().length >= 8;
  const secretKeyValid = form.secretKey.trim().length >= 8;
  const canSave = Boolean(form.marketplace) && selectedOption?.enabled && supplierValid && apiKeyValid && secretKeyValid;

  const openCreateForm = () => {
    setFormOpen(true);
    setSuccessMessage('');
    setShowSecret(false);
    setForm(INITIAL_FORM);
  };

  const openEditForm = (row: MarketplaceRecord) => {
    setFormOpen(true);
    setSuccessMessage('');
    setShowSecret(false);
    setForm({
      id: row.id,
      marketplace: row.marketplace,
      supplierId: row.supplierId,
      apiKey: row.apiKeyMasked,
      secretKey: row.secretMasked
    });
  };

  const onSave = () => {
    if (!canSave) return;
    saveMarketplaceRecord({
      id: form.id,
      marketplace: form.marketplace as MarketplaceKey,
      supplierId: form.supplierId,
      apiKey: form.apiKey,
      secretKey: form.secretKey
    });
    setSuccessMessage('Kaydedildi.');
  };

  return (
    <div className="space-y-6">
      <section className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="card-title">Pazaryeri Ekle</h2>
            <p className="card-subtitle">Pazaryeri bağlantı bilgilerini girin ve yönetmeye başlayın.</p>
          </div>
          <button type="button" className="btn btn-primary" onClick={openCreateForm}>
            <Plus className="h-4 w-4" />
            <span>Pazaryeri Ekle</span>
          </button>
        </div>

        {formOpen ? (
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
              <label className="space-y-1.5 text-sm text-slate-700">
                <span>Pazaryeri</span>
                <select
                  className="input"
                  value={form.marketplace}
                  onChange={(event) => {
                    setSuccessMessage('');
                    setForm((prev) => ({ ...prev, marketplace: event.target.value as MarketplaceKey }));
                  }}
                >
                  <option value="">Seçin</option>
                  {MARKETPLACE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value} disabled={!option.enabled}>
                      {option.label}{option.enabled ? '' : ' (Yakında)'}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-3 md:grid-cols-4">
                <label className="space-y-1.5 text-sm text-slate-700">
                  <span>Satıcı ID</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="input"
                    value={form.supplierId}
                    onChange={(event) => {
                      setSuccessMessage('');
                      const onlyDigits = event.target.value.replace(/[^\d]/g, '');
                      setForm((prev) => ({ ...prev, supplierId: onlyDigits }));
                    }}
                    placeholder="123456"
                  />
                </label>

                <label className="space-y-1.5 text-sm text-slate-700">
                  <span>API Key</span>
                  <input
                    type="text"
                    className="input"
                    value={form.apiKey}
                    onChange={(event) => {
                      setSuccessMessage('');
                      setForm((prev) => ({ ...prev, apiKey: event.target.value }));
                    }}
                  />
                </label>

                <label className="space-y-1.5 text-sm text-slate-700">
                  <span>Secret Key</span>
                  <div className="flex items-center gap-2">
                    <input
                      type={showSecret ? 'text' : 'password'}
                      className="input"
                      value={form.secretKey}
                      onChange={(event) => {
                        setSuccessMessage('');
                        setForm((prev) => ({ ...prev, secretKey: event.target.value }));
                      }}
                    />
                    <button type="button" className="btn btn-secondary h-11 w-11 p-0" onClick={() => setShowSecret((prev) => !prev)} aria-label="Secret key göster/gizle">
                      {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </label>

                <div className="flex items-end">
                  <button type="button" className="btn btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50" disabled={!canSave} onClick={onSave}>
                    Kaydet
                  </button>
                </div>
              </div>
            </div>

            {form.marketplace === 'trendyol' ? (
              <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-600">
                <p>Trendyol Partner API için Basic Authentication kullanılır. Header'da Auth + User-Agent zorunludur.</p>
                <p className="mt-1 font-medium text-slate-700">{'User-Agent: "${supplierId} - SelfIntegration"'}</p>
              </div>
            ) : null}

            <div className="mt-3 space-y-1 text-xs">
              {!supplierValid && form.supplierId.length > 0 ? (
                <p className="error-text flex items-center gap-1 text-rose-600"><AlertCircle className="h-3.5 w-3.5" />Satıcı ID sadece rakam olmalıdır.</p>
              ) : null}
              {!apiKeyValid && form.apiKey.length > 0 ? (
                <p className="error-text flex items-center gap-1 text-rose-600"><AlertCircle className="h-3.5 w-3.5" />API Key en az 8 karakter olmalıdır.</p>
              ) : null}
              {!secretKeyValid && form.secretKey.length > 0 ? (
                <p className="error-text flex items-center gap-1 text-rose-600"><AlertCircle className="h-3.5 w-3.5" />Secret Key en az 8 karakter olmalıdır.</p>
              ) : null}
              {successMessage ? (
                <p className="success-text flex items-center gap-1 text-emerald-600"><CheckCircle className="h-3.5 w-3.5" />{successMessage}</p>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>

      <section className="card p-6">
        <div className="card-header">
          <h2 className="card-title">Pazaryeri Listesi</h2>
          <p className="card-subtitle">Kayıtlı entegrasyonları aktif/pasif yönetebilir veya düzenleyebilirsiniz.</p>
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">Henüz pazaryeri eklenmedi.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3">Marketplace</th>
                  <th className="py-2 pr-3">SupplierId</th>
                  <th className="py-2 pr-3">API Key</th>
                  <th className="py-2 pr-3">Durum</th>
                  <th className="py-2 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 text-slate-700">
                    <td className="py-3 pr-3">{marketplaceLabel(row.marketplace)}</td>
                    <td className="py-3 pr-3">{row.supplierId}</td>
                    <td className="py-3 pr-3">{row.apiKeyMasked}</td>
                    <td className="py-3 pr-3">
                      <button
                        type="button"
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${row.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}
                        onClick={() => toggleMarketplaceActive(row.id)}
                      >
                        {row.isActive ? 'Active' : 'Passive'}
                      </button>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button type="button" className="btn btn-secondary h-8 px-2" onClick={() => openEditForm(row)}>
                          <Pencil className="h-3.5 w-3.5" />
                          <span>Düzenle</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary h-8 px-2 text-rose-600"
                          onClick={() => {
                            if (window.confirm('Bu kayıt silinsin mi?')) deleteMarketplaceRecord(row.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Sil</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function marketplaceLabel(value: MarketplaceKey) {
  const map: Record<MarketplaceKey, string> = {
    trendyol: 'Trendyol',
    hepsiburada: 'Hepsiburada',
    amazon: 'Amazon',
    n11: 'N11',
    ciceksepeti: 'Çiçeksepeti',
    etsy: 'Etsy',
    temu: 'Temu'
  };
  return map[value];
}
