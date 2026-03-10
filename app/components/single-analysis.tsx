'use client';

import { useMemo, useState } from 'react';
import { AiPanel, type AiPanelItem } from '@/app/components/ai-panel';

type SingleInput = {
  salesPrice: number;
  costPrice: number;
  commissionRate: number;
  shippingCost: number;
  advertisingCost: number;
  targetProfit: number;
  vatRate: number;
  campaignEnabled: boolean;
  discountRate: number;
  couponValue: number;
};

type Status = 'loss' | 'weak' | 'ok';

const initialValues: SingleInput = {
  salesPrice: 120,
  costPrice: 60,
  commissionRate: 20,
  shippingCost: 10,
  advertisingCost: 10,
  targetProfit: 15,
  vatRate: 20,
  campaignEnabled: false,
  discountRate: 0,
  couponValue: 0
};

const VAT_PRESETS = [20, 10, 1] as const;

export function SingleAnalysis() {
  const [values, setValues] = useState<SingleInput>(initialValues);
  const isCustomVat = !VAT_PRESETS.includes(values.vatRate as (typeof VAT_PRESETS)[number]);

  const result = useMemo(() => calculate(values), [values]);
  const assistantMessage = useMemo(
    () => buildAssistant(result.status, values.campaignEnabled),
    [result.status, values.campaignEnabled]
  );
  const assistantItems = useMemo(() => toSingleAiPanelItems(assistantMessage, result.status), [assistantMessage, result.status]);

  const onNumberChange = (key: keyof Omit<SingleInput, 'campaignEnabled'>, raw: string) => {
    const numeric = Number(raw);
    const safe = Number.isFinite(numeric) ? numeric : 0;

    setValues((prev) => {
      const next: SingleInput = { ...prev, [key]: safe };

      next.commissionRate = clamp(next.commissionRate, 0, 100);
      next.discountRate = clamp(next.discountRate, 0, 100);
      next.vatRate = Math.max(0, next.vatRate);
      next.couponValue = Math.max(0, next.couponValue);

      if (!next.campaignEnabled) {
        next.discountRate = 0;
        next.couponValue = 0;
        return next;
      }

      if (key === 'discountRate' && next.discountRate > 0) {
        next.couponValue = 0;
      }

      if (key === 'couponValue' && next.couponValue > 0) {
        next.discountRate = 0;
      }

      return next;
    });
  };

  const onCampaignToggle = (checked: boolean) => {
    setValues((prev) => ({
      ...prev,
      campaignEnabled: checked,
      discountRate: checked ? prev.discountRate : 0,
      couponValue: checked ? prev.couponValue : 0
    }));
  };

  const resetScenario = () => setValues(initialValues);

  const onVatPresetSelect = (nextVatRate: number | 'custom') => {
    setValues((prev) => ({
      ...prev,
      vatRate: nextVatRate === 'custom' ? (isCustomVat ? prev.vatRate : 0) : nextVatRate
    }));
  };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-stretch">
      <section className="card p-6">
        <div className="card-header">
          <h2 className="card-title">Ürün Senaryosu</h2>
          <p className="card-subtitle">Temel maliyetleri ve kampanya etkisini gir, sonuçlar anlık güncellensin.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Satış Fiyatı (₺)">
            <input
              type="number"
              className="input"
              value={values.salesPrice}
              onChange={(e) => onNumberChange('salesPrice', e.target.value)}
            />
          </Field>
          <Field label="Ürün Maliyeti (₺)">
            <input
              type="number"
              className="input"
              value={values.costPrice}
              onChange={(e) => onNumberChange('costPrice', e.target.value)}
            />
          </Field>
          <Field label="Komisyon (%)">
            <input
              type="number"
              min={0}
              max={100}
              className="input"
              value={values.commissionRate}
              onChange={(e) => onNumberChange('commissionRate', e.target.value)}
            />
          </Field>
          <Field label="Kargo (₺)">
            <input
              type="number"
              className="input"
              value={values.shippingCost}
              onChange={(e) => onNumberChange('shippingCost', e.target.value)}
            />
          </Field>
          <Field label="Reklam (₺)">
            <input
              type="number"
              className="input"
              value={values.advertisingCost}
              onChange={(e) => onNumberChange('advertisingCost', e.target.value)}
            />
          </Field>
          <Field label="Hedef Kâr (₺)">
            <input
              type="number"
              className="input"
              value={values.targetProfit}
              onChange={(e) => onNumberChange('targetProfit', e.target.value)}
            />
          </Field>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
          <div className="min-w-fit">
            <p className="text-sm text-slate-700">KDV Oranı (%)</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {VAT_PRESETS.map((rate) => {
              const active = values.vatRate === rate;
              return (
                <button
                  key={rate}
                  type="button"
                  onClick={() => onVatPresetSelect(rate)}
                  className={active ? 'badge bg-slate-900 text-white' : 'badge bg-white text-slate-700'}
                >
                  %{rate}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => onVatPresetSelect('custom')}
              className={isCustomVat ? 'badge bg-slate-900 text-white' : 'badge bg-white text-slate-700'}
            >
              Diğer
            </button>
          </div>

          {isCustomVat ? (
            <label className="w-24 text-sm text-slate-700">
              <span className="sr-only">Özel KDV oranı</span>
              <input
                type="number"
                min={0}
                step={0.1}
                className="input"
                value={values.vatRate}
                onChange={(e) => onNumberChange('vatRate', e.target.value)}
              />
            </label>
          ) : null}
        </div>

        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={values.campaignEnabled}
              onChange={(e) => onCampaignToggle(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            Kampanya
          </label>

          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <Field label="İndirim (%)">
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                disabled={!values.campaignEnabled || values.couponValue > 0}
                className="input disabled:bg-slate-100 disabled:text-slate-400"
                value={values.discountRate}
                onChange={(e) => onNumberChange('discountRate', e.target.value)}
              />
            </Field>
            <Field label="Kupon (₺)">
              <input
                type="number"
                min={0}
                step={1}
                disabled={!values.campaignEnabled || values.discountRate > 0}
                className="input disabled:bg-slate-100 disabled:text-slate-400"
                value={values.couponValue}
                onChange={(e) => onNumberChange('couponValue', e.target.value)}
              />
            </Field>
          </div>
        </div>

        <div className="mt-5">
          <button type="button" onClick={resetScenario} className="btn btn-secondary">
            Senaryoyu Sıfırla
          </button>
        </div>
      </section>

      <aside className="space-y-4 lg:sticky lg:top-6 lg:flex lg:h-full lg:flex-col">
        <AiPanel items={assistantItems} />

        <section className="card p-6 lg:flex-1">
          <p className="text-sm font-medium text-slate-500">Net Kâr</p>
          <p className="number-display mt-1 text-4xl font-semibold text-slate-900">{formatTry(result.netProfit)}</p>
          <p className="mt-2 text-sm text-slate-600">Net Satış (KDV Hariç): {formatTry(result.netSales)}</p>

          <div className="mt-4 flex items-center gap-2">
            <span className={statusBadgeClass(result.status)}>{statusLabel(result.status)}</span>
            <span className="text-sm text-slate-600">Marj: %{result.marginPct.toFixed(1)}</span>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">100 Adet Toplam</p>
            <p className="number-display text-lg font-semibold text-slate-900">{formatTry(result.netProfit * 100)}</p>
          </div>

          <p className="mt-4 text-xs text-slate-500">Satış fiyatı KDV dahil kabul edilir. Hesaplar anlık güncellenir.</p>
        </section>
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-2 text-sm text-slate-700">
      <span>{label}</span>
      {children}
    </label>
  );
}

function calculate(input: SingleInput) {
  const discountRate = input.campaignEnabled ? clamp(input.discountRate, 0, 100) : 0;
  const couponValue = input.campaignEnabled ? Math.max(0, input.couponValue) : 0;
  const vatRate = Math.max(0, input.vatRate);

  const effectivePrice = Math.max(0, input.salesPrice - input.salesPrice * (discountRate / 100) - couponValue);
  const netSales = effectivePrice / (1 + vatRate / 100);
  const commission = effectivePrice * (clamp(input.commissionRate, 0, 100) / 100);
  const netProfit = netSales - (input.costPrice + input.shippingCost + input.advertisingCost + commission);
  const marginPct = netSales > 0 ? (netProfit / netSales) * 100 : 0;

  const status: Status = netProfit < 0 ? 'loss' : netProfit >= input.targetProfit ? 'ok' : 'weak';

  return {
    effectivePrice,
    netSales,
    commission,
    netProfit,
    marginPct,
    status
  };
}

function buildAssistant(status: Status, campaignEnabled: boolean): string[] {
  if (status === 'ok') {
    return [
      'Tanı: Senaryo hedef kârı karşılıyor.',
      'Öneri: Reklam ve kargo kalemlerini küçük adımlarla optimize ederek marjı koru.',
      `Kontrol: ${campaignEnabled ? 'Kampanya açıkken efektif fiyat ve KDV hariç net satış hesabını kontrol et' : 'Satış fiyatının KDV dahil, maliyetlerin gider bazlı işlendiğini doğrula'}.`
    ];
  }

  if (status === 'weak') {
    return [
      'Tanı: Senaryo pozitif ama hedef kârın altında.',
      'Öneri: İndirim/kupon derinliğini azaltıp kargo ve reklam bütçesini yeniden dengele.',
      'Kontrol: Komisyon oranının kategoriyle uyumlu olduğunu, satış fiyatının KDV dahil kabul edildiğini ve net satışın KDV hariç hesaplandığını teyit et.'
    ];
  }

  return [
    'Tanı: Senaryo mevcut parametrelerde zararda.',
    'Öneri: Önce kampanya maliyetini hafiflet, ardından kargo ve reklam kalemlerinde daha sürdürülebilir bir seviye dene.',
    'Kontrol: Efektif satış fiyatı, KDV hariç net satış ve komisyon hesabını adım adım doğrulayarak zarar kaynağını netleştir.'
  ];
}

function toSingleAiPanelItems(lines: string[], status: Status): AiPanelItem[] {
  return lines.map((line, index) => {
    const tone = status === 'loss' ? 'danger' : status === 'weak' ? 'warning' : 'success';
    if (line.startsWith('Tanı')) return { icon: status === 'loss' ? 'trendDown' : 'trendUp', tone, emphasis: true, text: line };
    if (line.startsWith('Öneri')) return { icon: 'spark', tone, text: line };
    if (line.startsWith('Kontrol')) return { icon: 'check', tone: 'neutral', text: line };
    return { icon: index === 0 ? 'trendUp' : 'info', tone: 'neutral', text: line };
  });
}

function statusLabel(status: Status) {
  if (status === 'ok') return 'Hedefte';
  if (status === 'weak') return 'Hedef Altı';
  return 'Zarar';
}

function statusBadgeClass(status: Status) {
  if (status === 'ok') return 'badge bg-emerald-100 text-emerald-700';
  if (status === 'weak') return 'badge bg-amber-100 text-amber-700';
  return 'badge bg-rose-100 text-rose-700';
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatTry(value: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 2
  }).format(Number.isFinite(value) ? value : 0);
}
