'use client';

import { useEffect, useMemo, useState } from 'react';
import { AiPanel, type AiPanelItem } from '@/app/components/ai-panel';

type SingleInput = {
  salesPrice: number;
  costPrice: number;
  commissionRate: number;
  shippingCost: number;
  advertisingCost: number;
  targetProfit: number;
  vatRate: number;
  vatSelection: '20' | '10' | '1' | 'other';
  vatCustomPercent: number;
  campaignEnabled: boolean;
  discountRate: number;
  couponValue: number;
};

type Status = 'loss' | 'weak' | 'ok';
type TargetState = 'none' | 'below' | 'at' | 'above';

const initialValues: SingleInput = {
  salesPrice: 120,
  costPrice: 60,
  commissionRate: 20,
  shippingCost: 10,
  advertisingCost: 10,
  targetProfit: 15,
  vatRate: 0.2,
  vatSelection: '20',
  vatCustomPercent: 20,
  campaignEnabled: false,
  discountRate: 0,
  couponValue: 0
};

export function SingleAnalysis() {
  const [values, setValues] = useState<SingleInput>(initialValues);
  const [suggestedApplied, setSuggestedApplied] = useState(false);

  const result = useMemo(() => calculate(values), [values]);
  const assistantMessage = useMemo(() => buildAssistant(values, result), [result, values]);
  const assistantItems = useMemo(() => toSingleAiPanelItems(assistantMessage, result.status), [assistantMessage, result.status]);
  const hasRequiredForSuggestion = useMemo(
    () =>
      values.salesPrice > 0 &&
      values.costPrice > 0 &&
      values.commissionRate >= 0 &&
      values.shippingCost >= 0 &&
      values.advertisingCost >= 0 &&
      values.targetProfit > 0,
    [values]
  );
  const isSuggestedEqual = useMemo(() => {
    if (result.suggestedSalesPrice === null) return false;
    return Math.abs(values.salesPrice - result.suggestedSalesPrice) <= 0.01;
  }, [result.suggestedSalesPrice, values.salesPrice]);

  useEffect(() => {
    if (!isSuggestedEqual && suggestedApplied) {
      setSuggestedApplied(false);
    }
  }, [isSuggestedEqual, suggestedApplied]);

  const onNumberChange = (key: keyof Omit<SingleInput, 'campaignEnabled'>, raw: string) => {
    const numeric = Number(raw);
    const safe = Number.isFinite(numeric) ? numeric : 0;

    setValues((prev) => {
      const next: SingleInput = { ...prev, [key]: safe };

      next.commissionRate = clamp(next.commissionRate, 0, 100);
      next.discountRate = clamp(next.discountRate, 0, 100);
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

  const onVatSelectionChange = (selection: SingleInput['vatSelection']) => {
    setValues((prev) => {
      if (selection === '20') return { ...prev, vatSelection: selection, vatRate: 0.2 };
      if (selection === '10') return { ...prev, vatSelection: selection, vatRate: 0.1 };
      if (selection === '1') return { ...prev, vatSelection: selection, vatRate: 0.01 };
      return {
        ...prev,
        vatSelection: selection,
        vatRate: clamp(prev.vatCustomPercent / 100, 0, 1)
      };
    });
  };

  const onVatCustomChange = (raw: string) => {
    const numeric = Number(raw);
    const safe = Number.isFinite(numeric) ? clamp(numeric, 0, 100) : 0;
    setValues((prev) => ({
      ...prev,
      vatCustomPercent: safe,
      vatRate: prev.vatSelection === 'other' ? safe / 100 : prev.vatRate
    }));
  };

  const resetScenario = () => setValues(initialValues);

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
            <div className="rounded-xl border border-transparent p-1">
              <input
                type="number"
                className="input border-0 bg-white focus:border-0 focus:ring-0"
                value={values.advertisingCost}
                onChange={(e) => onNumberChange('advertisingCost', e.target.value)}
              />
            </div>
          </Field>
          <Field label="Hedef Kâr (₺)">
            <div className="relative overflow-hidden rounded-xl p-[1px]">
              <div
                className="absolute inset-[-60%] animate-spin"
                style={{
                  background: 'conic-gradient(from 0deg, transparent 0deg, #c4b5fd 90deg, transparent 180deg, #ddd6fe 270deg, transparent 360deg)',
                  animationDuration: '4s'
                }}
              />
              <div className="relative rounded-[11px] bg-white p-1">
                <input
                  type="number"
                  className="input border-0 bg-white focus:border-0 focus:ring-0"
                  value={values.targetProfit}
                  onChange={(e) => onNumberChange('targetProfit', e.target.value)}
                />
              </div>
            </div>
          </Field>

          <div className="space-y-2 md:col-span-2">
            <p className="text-sm text-slate-700">KDV Oranı</p>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className={`btn ${values.vatSelection === '20' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => onVatSelectionChange('20')}>%20</button>
              <button type="button" className={`btn ${values.vatSelection === '10' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => onVatSelectionChange('10')}>%10</button>
              <button type="button" className={`btn ${values.vatSelection === '1' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => onVatSelectionChange('1')}>%1</button>
              <div className="flex items-center gap-2">
                <button type="button" className={`btn ${values.vatSelection === 'other' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => onVatSelectionChange('other')}>Diğer</button>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  disabled={values.vatSelection !== 'other'}
                  className="input w-32 disabled:bg-slate-100 disabled:text-slate-400"
                  value={values.vatCustomPercent}
                  onChange={(e) => onVatCustomChange(e.target.value)}
                />
              </div>
            </div>
          </div>
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

          <div className="mt-4 flex items-center gap-2">
            <span className={targetBadgeClass(result.targetState)}>{targetLabel(result.targetState, result.status)}</span>
            <span className="text-sm text-slate-600">Marj: %{result.marginPct.toFixed(1)}</span>
          </div>
          <p className="mt-2 text-sm text-slate-600">KDV Hariç Net Satış: {formatTry(result.netSales)}</p>

          {values.targetProfit > 0 ? (
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Hedef Kâr: {formatTry(values.targetProfit)}</p>
              <p className="mt-1 text-sm font-medium text-slate-800">Fark: {targetDiffText(result.targetDiff, result.targetState)}</p>
              {hasRequiredForSuggestion && result.suggestedSalesPrice !== null ? (
                <div className="mt-3 rounded-lg border border-slate-300 bg-white p-3">
                  <p className="text-xs text-slate-500">Önerilen Satış Fiyatı</p>
                  <p className="number-display text-xl font-semibold text-slate-900">{formatTry(result.suggestedSalesPrice)}</p>
                  <button
                    type="button"
                    className="btn btn-secondary mt-2 w-full"
                    onClick={() => {
                      onNumberChange('salesPrice', String(result.suggestedSalesPrice));
                      setSuggestedApplied(true);
                    }}
                    disabled={isSuggestedEqual}
                  >
                    Satış fiyatını önerilen tutarla güncelle
                  </button>
                  {suggestedApplied && isSuggestedEqual ? <p className="success-text mt-2 text-xs text-emerald-600">✓ Önerilen fiyat uygulandı.</p> : null}
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-3 text-xs text-slate-500">Hedef kâr girildiğinde karşılaştırma burada görünür.</p>
          )}

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">100 Adet Toplam</p>
            <p className="number-display text-lg font-semibold text-slate-900">{formatTry(result.netProfit * 100)}</p>
          </div>

          <p className="mt-4 text-xs text-slate-500">Hesaplar anlık güncellenir.</p>
          <p className="mt-1 text-xs text-slate-500">Kâr hesapları KDV hariç satış tutarı üzerinden yapılır.</p>
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
  const vatRate = clamp(input.vatRate, 0, 1);

  const effectivePrice = Math.max(0, input.salesPrice - input.salesPrice * (discountRate / 100) - couponValue);
  const netSales = effectivePrice / (1 + vatRate);
  const commission = netSales * (clamp(input.commissionRate, 0, 100) / 100);
  const netProfit = netSales - (input.costPrice + input.shippingCost + input.advertisingCost + commission);
  const marginPct = netSales > 0 ? (netProfit / netSales) * 100 : 0;

  const status: Status = netProfit < 0 ? 'loss' : netProfit >= input.targetProfit ? 'ok' : 'weak';
  const tolerance = 1;
  const hasTarget = input.targetProfit > 0;
  const targetDiff = netProfit - input.targetProfit;
  const targetState: TargetState = !hasTarget
    ? 'none'
    : Math.abs(targetDiff) <= tolerance
      ? 'at'
      : targetDiff > 0
        ? 'above'
        : 'below';

  const suggestedSalesPrice = hasTarget ? calculateSuggestedSalesPrice(input) : null;

  return {
    effectivePrice,
    netSales,
    commission,
    netProfit,
    marginPct,
    status,
    targetDiff,
    targetState,
    suggestedSalesPrice
  };
}

function buildAssistant(input: SingleInput, result: ReturnType<typeof calculate>): string[] {
  const lines: string[] = [];

  if (input.targetProfit > 0) {
    if (result.targetState === 'above') {
      lines.push('Tanı: Senaryo hedef kârın üzerinde, fiyat rekabetini de kontrol et.');
    } else if (result.targetState === 'at') {
      lines.push('Tanı: Senaryo hedef kârı karşılıyor.');
    } else {
      lines.push('Tanı: Senaryo hedef kârın altında kalıyor.');
      if (result.suggestedSalesPrice !== null) {
        lines.push(`Öneri: Hedefe yaklaşmak için satış fiyatını ${formatTry(result.suggestedSalesPrice)} seviyesinde test edebilirsin.`);
      }
    }
  } else if (result.netProfit >= 0) {
    lines.push('Tanı: Senaryo pozitif net kâr üretiyor.');
  } else {
    lines.push('Tanı: Senaryo mevcut parametrelerde zararda.');
  }

  const suggestions: string[] = [];

  if (input.campaignEnabled && (input.discountRate > 0 || input.couponValue > 0)) {
    suggestions.push('Öneri: İndirim ve kupon etkisinin net kârı ne kadar düşürdüğünü kontrol et.');
  }
  if (input.advertisingCost > 0) {
    suggestions.push('Öneri: Reklam maliyetini optimize ederek net kârı güçlendirebilirsin.');
  }
  if (input.shippingCost > 0) {
    suggestions.push('Öneri: Kargo maliyeti tarafında daha verimli bir seviye dene.');
  }
  if (suggestions.length === 0) {
    suggestions.push('Öneri: Satış fiyatı ve maliyet varsayımını küçük adımlarla test ederek marjı koru.');
  }

  lines.push(...suggestions.slice(0, 2));
  lines.push('Kontrol: Komisyon oranının kategori için beklediğin oranla uyumlu olduğunu teyit et.');

  return lines;
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

function targetLabel(targetState: TargetState, status: Status) {
  if (targetState === 'above') return 'Hedef Üstü';
  if (targetState === 'at') return 'Hedefte';
  if (targetState === 'below') return 'Hedef Altı';
  return statusLabel(status);
}

function targetBadgeClass(targetState: TargetState) {
  if (targetState === 'above') return 'badge bg-emerald-100 text-emerald-700';
  if (targetState === 'at') return 'badge bg-slate-200 text-slate-700';
  if (targetState === 'below') return 'badge bg-amber-100 text-amber-700';
  return 'badge bg-slate-100 text-slate-700';
}

function targetDiffText(diff: number, targetState: TargetState) {
  if (targetState === 'at') return 'Tam hedefte';
  if (targetState === 'above') return `${formatTry(Math.abs(diff))} üstünde`;
  if (targetState === 'below') return `${formatTry(Math.abs(diff))} altında`;
  return '-';
}

function calculateSuggestedSalesPrice(input: SingleInput): number | null {
  if (input.targetProfit <= 0) return null;

  const discountRate = input.campaignEnabled ? clamp(input.discountRate, 0, 100) / 100 : 0;
  const couponValue = input.campaignEnabled ? Math.max(0, input.couponValue) : 0;
  const commissionRate = clamp(input.commissionRate, 0, 100) / 100;
  const vatRate = clamp(input.vatRate, 0, 1);

  const contributionRate = ((1 - discountRate) * (1 - commissionRate)) / (1 + vatRate);
  if (contributionRate <= 0) return null;

  const couponImpact = (couponValue / (1 + vatRate)) * (1 - commissionRate);
  const fixedCost = input.costPrice + input.shippingCost + input.advertisingCost + input.targetProfit + couponImpact;
  const suggested = fixedCost / contributionRate;
  if (!Number.isFinite(suggested) || suggested <= 0) return null;
  return Math.round(suggested * 100) / 100;
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
