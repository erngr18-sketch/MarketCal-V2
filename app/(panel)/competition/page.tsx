'use client';

import { useEffect, useMemo, useState } from 'react';
import { AiPanel, type AiPanelItem } from '@/app/components/ai-panel';
import {
  formatTry,
  runCompetition,
  validateTrendyolUrl,
  type CompetitionMode,
  type CompetitionOutput
} from '@/lib/profit/competition-engine';
import { calculateVatAwarePricing } from '@/lib/profit/pricing-engine';

const EXAMPLE_TRENDYOL_SR_URL = 'https://www.trendyol.com/sr?qt=kazak&st=kazak';

type FormState = {
  url: string;
  mode: CompetitionMode;
  myPrice: string;
  costPrice: string;
  commissionRate: string;
  shippingCost: string;
  advertisingCost: string;
  targetProfit: string;
  vatRate: string;
  manualOpen: boolean;
  manualLow: string;
  manualMid: string;
  manualHigh: string;
};

type ValidationState = {
  url?: string;
  myPrice?: string;
  costPrice?: string;
  commissionRate?: string;
  manual?: string;
  submit?: string;
};

const INITIAL_STATE: FormState = {
  url: EXAMPLE_TRENDYOL_SR_URL,
  mode: 'best_sellers',
  myPrice: '',
  costPrice: '',
  commissionRate: '0',
  shippingCost: '0',
  advertisingCost: '0',
  targetProfit: '0',
  vatRate: '20',
  manualOpen: false,
  manualLow: '',
  manualMid: '',
  manualHigh: ''
};

const VAT_PRESETS = ['20', '10', '1'] as const;

export default function CompetitionPage() {
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [errors, setErrors] = useState<ValidationState>({});
  const [result, setResult] = useState<CompetitionOutput | null>(null);
  const isCustomVat = !VAT_PRESETS.includes(form.vatRate as (typeof VAT_PRESETS)[number]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const searchParams = new URLSearchParams(window.location.search);
    const priceParam = searchParams.get('price');
    if (!priceParam) return;
    const parsed = Number(priceParam);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    setForm((prev) => ({
      ...prev,
      myPrice: prev.myPrice.trim().length > 0 ? prev.myPrice : String(Math.round(parsed * 100) / 100)
    }));
  }, []);

  const parsed = useMemo(() => parseInputs(form), [form]);
  const profit = useMemo(() => calculateProfitMetrics(parsed), [parsed]);
  const urlValidation = useMemo(() => validateTrendyolUrl(form.url), [form.url]);

  const canRun = useMemo(() => {
    if (!urlValidation.ok) return false;
    if (!(parsed.myPrice > 0)) return false;
    if (parsed.costPrice < 0) return false;
    if (!parsed.commissionValid) return false;
    if (form.manualOpen && !parsed.manualValid) return false;
    return true;
  }, [form.manualOpen, parsed.commissionValid, parsed.costPrice, parsed.manualValid, parsed.myPrice, urlValidation.ok]);

  const onRunAnalysis = () => {
    const nextErrors: ValidationState = {};

    if (!form.url.trim() || !urlValidation.ok) {
      nextErrors.url = urlValidation.reason ?? 'Geçerli bir Trendyol linki girin.';
    }
    if (!(parsed.myPrice > 0)) {
      nextErrors.myPrice = 'Satış fiyatı girmelisin.';
    }
    if (parsed.costPrice < 0) {
      nextErrors.costPrice = 'Maliyet değeri geçerli olmalı.';
    }
    if (!parsed.commissionValid) {
      nextErrors.commissionRate = 'Komisyon oranını kontrol et.';
    }
    if (form.manualOpen && !parsed.manualValid) {
      nextErrors.manual = 'Manuel fiyatlarda düşük, orta ve yüksek sırası doğru olmalı.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    try {
      const useManual = form.manualOpen && parsed.manualValid;

      const output = runCompetition({
        url: form.url,
        mode: form.mode,
        source: useManual ? 'manual' : 'simulation',
        myPrice: parsed.myPrice,
        manualPrices: useManual
          ? {
              rival1: parsed.manualLow,
              rival2: parsed.manualMid,
              rival3: parsed.manualHigh
            }
          : undefined
      });

      setResult(output);
      setErrors({});
    } catch (error) {
      setErrors({ submit: error instanceof Error ? error.message : 'Analiz sırasında hata oluştu.' });
    }
  };

  const aiItems = useMemo(() => {
    const baseLines = (result?.assistantMessage ?? '⏱️ Analiz için girdileri tamamlayın.').split('\n');
    const parsedItems = baseLines.map(mapAssistantLineToItem);

    const profitability = profit.netProfit;
    const distance = profit.distanceToTarget;
    if (parsed.myPrice > 0 && parsed.costPrice > 0) {
      parsedItems.unshift({
        icon: profitability >= 0 ? 'check' : 'alert',
        tone: profitability >= 0 ? 'success' : 'danger',
        text:
          profitability >= 0
            ? `Maliyet ve gider varsayımıyla tahmini kâr: ${formatTry(profitability)}.`
            : `Maliyet ve gider varsayımıyla tahmini sonuç: ${formatTry(profitability)} (zarar riski).`
      });
      parsedItems.unshift({
        icon: distance <= 0 ? 'target' : 'alert',
        tone: distance <= 0 ? 'success' : 'warning',
        text:
          distance <= 0
            ? `Hedef kâr karşılanıyor (${profit.statusLabel}).`
            : `Hedefe uzaklık: ${formatTry(distance)} (${profit.statusLabel}).`
      });
      parsedItems.push({
        icon: 'check',
        tone: 'neutral',
        text: 'Hesaplama KDV hariç net satış üzerinden yapılır.'
      });
      parsedItems.unshift({
        icon: profit.priceSufficientForTarget ? 'check' : 'target',
        tone: profit.priceSufficientForTarget ? 'success' : 'warning',
        text: profit.priceSufficientForTarget
          ? 'Mevcut fiyat hem pazarda makul hem de hedef kâr açısından yeterli görünüyor.'
          : 'Bu fiyat pazarda dengeli görünse de hedef kâr için satış fiyatını artırman gerekebilir.'
      });
    }

    return parsedItems.slice(0, 5);
  }, [parsed, profit, result?.assistantMessage]);

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold text-slate-900">Fiyatın Pazarda Nerede?</h1>
        <p className="mt-1 text-sm text-slate-600">Trendyol sonuçlarına göre fiyatının pazarda hangi seviyede olduğunu gör.</p>
        <p className="mt-1 text-xs text-slate-500">Linki kontrol et → senaryonu gir → analizi başlat</p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="card p-6">
          <div className="card-header">
            <h2 className="card-title">Ürün Senaryosu</h2>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Satış Fiyatı (₺)">
              <input
                type="number"
                min={0}
                step={0.01}
                className="input"
                value={form.myPrice}
                onChange={(event) => setForm((prev) => ({ ...prev, myPrice: event.target.value }))}
              />
              {errors.myPrice ? <p className="error-text text-xs text-rose-600">{errors.myPrice}</p> : null}
            </Field>

            <Field label="Maliyet (₺)">
              <input
                type="number"
                min={0}
                step={0.01}
                className="input"
                value={form.costPrice}
                onChange={(event) => setForm((prev) => ({ ...prev, costPrice: event.target.value }))}
              />
              {errors.costPrice ? <p className="error-text text-xs text-rose-600">{errors.costPrice}</p> : null}
            </Field>

            <Field label="Komisyon (%)">
              <input
                type="number"
                min={0}
                max={99.99}
                step={0.01}
                className="input"
                value={form.commissionRate}
                onChange={(event) => setForm((prev) => ({ ...prev, commissionRate: event.target.value }))}
              />
              {errors.commissionRate ? <p className="error-text text-xs text-rose-600">{errors.commissionRate}</p> : null}
            </Field>

            <Field label="Kargo (₺)">
              <input
                type="number"
                min={0}
                step={0.01}
                className="input"
                value={form.shippingCost}
                onChange={(event) => setForm((prev) => ({ ...prev, shippingCost: event.target.value }))}
              />
            </Field>

            <Field label="Reklam (₺)">
              <input
                type="number"
                min={0}
                step={0.01}
                className="input"
                value={form.advertisingCost}
                onChange={(event) => setForm((prev) => ({ ...prev, advertisingCost: event.target.value }))}
              />
            </Field>

            <Field label="Hedef Kâr (₺)">
              <input
                type="number"
                min={0}
                step={0.01}
                className="input"
                value={form.targetProfit}
                onChange={(event) => setForm((prev) => ({ ...prev, targetProfit: event.target.value }))}
              />
            </Field>
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
            <div className="min-w-fit">
              <p className="text-sm text-slate-700">KDV Oranı (%)</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {VAT_PRESETS.map((rate) => {
                const active = form.vatRate === rate;
                return (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, vatRate: rate }))}
                    className={active ? 'badge bg-slate-900 text-white' : 'badge bg-white text-slate-700'}
                  >
                    %{rate}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, vatRate: isCustomVat ? prev.vatRate : '0' }))}
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
                  value={form.vatRate}
                  onChange={(event) => setForm((prev) => ({ ...prev, vatRate: event.target.value }))}
                />
              </label>
            ) : null}
          </div>

          <div className="mt-5 space-y-4 border-t border-slate-200 pt-4">
            <Field label="Trendyol Link">
              <input
                type="url"
                className="input"
                value={form.url}
                onChange={(event) => setForm((prev) => ({ ...prev, url: event.target.value }))}
                placeholder={EXAMPLE_TRENDYOL_SR_URL}
              />
              {!form.url.trim() ? <p className="helper-text text-xs text-slate-500">Örnek: {EXAMPLE_TRENDYOL_SR_URL}</p> : null}
              {form.url.trim() && !urlValidation.ok ? <p className="error-text text-xs text-rose-600">{errors.url ?? urlValidation.reason}</p> : null}
              {form.url.trim() && urlValidation.ok ? <p className="success-text text-xs text-emerald-600">Geçerli Trendyol linki</p> : null}
            </Field>

            <div className="space-y-2 text-sm text-slate-700">
              <p>Mod</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={`btn ${form.mode === 'best_sellers' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setForm((prev) => ({ ...prev, mode: 'best_sellers' }))}
                >
                  En Çok Satan
                </button>
                <button
                  type="button"
                  className={`btn ${form.mode === 'most_reviewed' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setForm((prev) => ({ ...prev, mode: 'most_reviewed' }))}
                >
                  En Çok Yorumlanan
                </button>
              </div>
              <p className="helper-text text-xs text-slate-500">Seçilen moda göre sonuç sayfasından ilk 20 ürünü baz alıp fiyat bandı simüle eder.</p>
            </div>

            <div>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-slate-300"
                  checked={form.manualOpen}
                  onChange={(event) => setForm((prev) => ({ ...prev, manualOpen: event.target.checked }))}
                />
                Pazaryeri Ortalama Fiyat Değerlerini Gir
              </label>

              {form.manualOpen ? (
                <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="helper-text mb-2 text-xs text-slate-500">Örn: 499 / 699 / 899</p>
                  <div className="grid gap-3 md:grid-cols-3">
                    <Field label="Düşük (₺)">
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        className="input"
                        value={form.manualLow}
                        placeholder="499"
                        onChange={(event) => setForm((prev) => ({ ...prev, manualLow: event.target.value }))}
                      />
                    </Field>
                    <Field label="Orta (₺)">
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        className="input"
                        value={form.manualMid}
                        placeholder="699"
                        onChange={(event) => setForm((prev) => ({ ...prev, manualMid: event.target.value }))}
                      />
                    </Field>
                    <Field label="Yüksek (₺)">
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        className="input"
                        value={form.manualHigh}
                        placeholder="899"
                        onChange={(event) => setForm((prev) => ({ ...prev, manualHigh: event.target.value }))}
                      />
                    </Field>
                  </div>
                  {errors.manual ? <p className="error-text mt-2 text-xs text-rose-600">{errors.manual}</p> : null}
                </div>
              ) : null}
            </div>

            {errors.submit ? <p className="error-text text-sm text-rose-600">{errors.submit}</p> : null}

            <button
              type="button"
              className="btn btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
              onClick={onRunAnalysis}
              disabled={!canRun}
            >
              Fiyatımı Analiz Et
            </button>
            {!canRun ? <p className="helper-text text-xs text-slate-500">Analizi başlatmak için link + fiyat + maliyet girin.</p> : null}
            {form.manualOpen && !parsed.manualValid ? <p className="error-text text-xs text-rose-600">Manuel fiyatlarda düşük, orta ve yüksek sırası doğru olmalı.</p> : null}
          </div>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <AiPanel items={aiItems} />

          <section className="card p-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="card-title">Fiyatının Pazardaki Yeri</h3>
              {result ? <CompetitionRankBadge segmentLabel={profit.statusLabel} /> : null}
            </div>

            {result ? (
              <>
                <p className="mt-1 text-sm text-slate-600">Bu fiyat pazardaki ürünlerin yaklaşık %{result.myPercentile}'sinden daha pahalı.</p>

                <div className="mt-4">
                  <div className="relative h-2 rounded-full bg-slate-100">
                    <div
                      className="absolute -top-1.5 h-5 w-1 -translate-x-1/2 rounded bg-slate-900"
                      style={{ left: `${positionPercent(result.myPrice, result.stats.min, result.stats.max)}%` }}
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                    <Pill label="Alt Bant" value={formatTry(result.stats.q1)} />
                    <Pill label="Orta Bant" value={formatTry(result.stats.median)} />
                    <Pill label="Üst Bant" value={formatTry(result.stats.q3)} />
                  </div>
                  <div className="mt-2 space-y-1 text-[11px] text-slate-500">
                    <p>Alt bant → Daha ucuz ürünler</p>
                    <p>Orta bant → Pazarın ortalama fiyatı</p>
                    <p>Üst bant → Daha pahalı ürünler</p>
                  </div>
                  <p className="mt-2 text-xs font-medium text-slate-700">Senin fiyatın: {formatTry(result.myPrice)}</p>
                </div>

                <div className="mt-4 grid gap-2">
                  <ResultBlock label="Net Satış (KDV Hariç)" value={formatTry(profit.netSales)} />
                  <ResultBlock label="Komisyon" value={formatTry(profit.commissionAmount)} />
                  <ResultBlock label="Net Kâr" value={formatTry(profit.netProfit)} emphasis />
                  <ResultBlock label="Hedef Kâr Farkı" value={profit.targetGapLabel} />
                  <ResultBlock label="Önerilen Satış Fiyatı" value={formatTry(profit.suggestedPrice)} accent />
                </div>
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-slate-600">{profit.targetGapHelper}</p>
                  <p className="text-xs text-slate-600">{profit.suggestedPriceMessage}</p>
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-500">Analizi başlattığında fiyatının pazardaki yeri ve kârlılık özeti burada görünür.</p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function CompetitionRankBadge({ segmentLabel }: { segmentLabel: string }) {
  if (segmentLabel === 'En Karlı') {
    return <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">🥇 En Karlı</span>;
  }
  if (segmentLabel === 'Hedefte') {
    return <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">🟢 Hedefte</span>;
  }
  if (segmentLabel === 'Sınırda') {
    return <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">🟠 Sınırda</span>;
  }
  return <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">🔴 Zararda</span>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1.5 text-sm text-slate-700">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-700">{label}: {value}</span>;
}

function ResultBlock({
  label,
  value,
  emphasis = false,
  accent = false
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  accent?: boolean;
}) {
  const className = emphasis
    ? 'rounded-xl border border-slate-300 bg-white px-3 py-2 shadow-sm'
    : accent
      ? 'rounded-xl border border-sky-200 bg-sky-50/60 px-3 py-2'
      : 'rounded-xl border border-slate-200 bg-slate-50 px-3 py-2';
  return (
    <div className={className}>
      <p className={emphasis ? 'text-[11px] text-slate-600' : 'text-[11px] text-slate-500'}>{label}</p>
      <p className={emphasis ? 'number-display text-base font-semibold text-slate-900' : 'number-display text-sm font-semibold text-slate-900'}>{value}</p>
    </div>
  );
}

function mapAssistantLineToItem(line: string): AiPanelItem {
  const trimmed = line.trim();
  if (trimmed.startsWith('✅')) return { text: trimmed.replace(/^✅\s*/, ''), icon: 'check', tone: 'success' };
  if (trimmed.startsWith('⚠️')) return { text: trimmed.replace(/^⚠️\s*/, ''), icon: 'alert', tone: 'warning' };
  if (trimmed.startsWith('🧭')) return { text: trimmed.replace(/^🧭\s*/, ''), icon: 'target', tone: 'neutral' };
  return { text: trimmed, icon: 'info', tone: 'neutral' };
}

function parseInputs(form: FormState) {
  const myPrice = parseNumber(form.myPrice);
  const costPrice = parseNumber(form.costPrice);
  const commissionRate = parseNumber(form.commissionRate);
  const shippingCost = parseNumber(form.shippingCost);
  const advertisingCost = parseNumber(form.advertisingCost);
  const targetProfit = parseNumber(form.targetProfit);
  const vatRate = parseNumber(form.vatRate);

  const manualLow = parseNumber(form.manualLow);
  const manualMid = parseNumber(form.manualMid);
  const manualHigh = parseNumber(form.manualHigh);
  const manualValid = manualLow > 0 && manualMid > 0 && manualHigh > 0 && manualLow < manualMid && manualMid < manualHigh;

  return {
    myPrice,
    costPrice,
    commissionRate,
    commissionValid: commissionRate >= 0 && commissionRate < 100,
    shippingCost,
    advertisingCost,
    targetProfit,
    vatRate,
    manualLow,
    manualMid,
    manualHigh,
    manualValid
  };
}

function calculateProfitMetrics(parsed: ReturnType<typeof parseInputs>) {
  const pricing = calculateVatAwarePricing({
    salesPrice: parsed.myPrice,
    costPrice: parsed.costPrice,
    commissionRate: parsed.commissionRate,
    shippingCost: parsed.shippingCost,
    advertisingCost: parsed.advertisingCost,
    targetProfit: parsed.targetProfit,
    vatRate: parsed.vatRate
  });
  const distanceToTarget = parsed.targetProfit - pricing.netProfit;
  const priceSufficientForTarget = parsed.myPrice >= pricing.suggestedSalesPrice;

  const statusLabel = pricing.netProfit >= parsed.targetProfit ? 'Hedefte' : pricing.netProfit >= 0 ? 'Sınırda' : 'Zararda';
  const targetGapLabel = pricing.targetGap >= 0 ? 'Hedef kârı karşılıyor.' : 'Hedef kârın altında.';
  const targetGapHelper = pricing.targetGap >= 0 ? 'Hedef kârı karşılıyor.' : 'Hedef kârın altında.';
  const suggestedPriceMessage = priceSufficientForTarget
    ? 'Mevcut fiyat hedef kâr için yeterli görünüyor.'
    : `Hedef kâra yaklaşmak için fiyatını yaklaşık ${formatTry(pricing.suggestedSalesPrice)} seviyesine çıkarman gerekebilir.`;

  return {
    netSales: pricing.netSales,
    commissionAmount: pricing.commissionAmount,
    netProfit: pricing.netProfit,
    distanceToTarget,
    targetGap: pricing.targetGap,
    targetGapLabel,
    targetGapHelper,
    suggestedPrice: pricing.suggestedSalesPrice,
    suggestedPriceMessage,
    priceSufficientForTarget,
    statusLabel
  };
}

function positionPercent(value: number, min: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max) || max <= min) return 50;
  return clamp(((value - min) / (max - min)) * 100, 0, 100);
}

function parseNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
