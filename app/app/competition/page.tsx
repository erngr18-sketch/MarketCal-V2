'use client';

import { useEffect, useMemo, useState } from 'react';
import { AiPanel, type AiPanelItem } from '@/app/components/ai-panel';
import { formatTry, validateTrendyolUrl } from '@/lib/profit/competition-engine';
import { detectMarketplace } from '@/lib/shared/detect-marketplace';

type SortMode = 'BEST_SELLER' | 'MOST_RATED' | 'MOST_FAVOURITE' | 'MOST_RECENT';

type FormState = {
  url: string;
  sortMode: SortMode;
  productLimit: string;
  myPrice: string;
  costPrice: string;
  commission: string;
  shippingCost: string;
  advertisingCost: string;
  targetProfit: string;
};
type VatMode = '20' | '10' | '1' | 'custom';

type ValidationState = {
  url?: string;
  submit?: string;
};

type AnalysisSuccess = {
  ok: true;
  normalizedUrl: string;
  partial: boolean;
  reason?: string;
  data: {
    ok: true;
    statistics: {
      min_price: number;
      average_price: number;
      median_price: number;
      max_price: number;
    };
    segments: {
      economic: { min: number; max: number };
      mid: { min: number; max: number };
      premium: { min: number; max: number };
    };
    summary: {
      summary_short_tr: string;
      insights_tr: string[];
      confidence_score: number;
    };
  };
};

type AnalysisFail = {
  ok: false;
  reason: string;
};

type AnalysisResponse = AnalysisSuccess | AnalysisFail;

type PositionResult = {
  profit: number;
  segment: 'Ekonomik bantta' | 'Orta bantta' | 'Premium bantta';
  deltaFromAverage: number;
  directionText: string;
  recommendedBandText: string;
  recommendation: string;
  markerPercent: number;
};

const SORT_MODE_OPTIONS: Array<{ value: SortMode; label: string }> = [
  { value: 'BEST_SELLER', label: 'Çok Satanlar' },
  { value: 'MOST_RATED', label: 'En Çok Değerlendirilen' },
  { value: 'MOST_FAVOURITE', label: 'En Favoriler' },
  { value: 'MOST_RECENT', label: 'En Yeniler' }
];

const EXAMPLE_TRENDYOL_SR_URL = 'https://www.trendyol.com/sr?qt=kazak&st=kazak';

const INITIAL_STATE: FormState = {
  url: '',
  sortMode: 'BEST_SELLER',
  productLimit: '20',
  myPrice: '',
  costPrice: '',
  commission: '0',
  shippingCost: '0',
  advertisingCost: '0',
  targetProfit: '0'
};

export default function CompetitionPage() {
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [vatMode, setVatMode] = useState<VatMode>('20');
  const [customVatPercent, setCustomVatPercent] = useState('20');
  const [vatRate, setVatRate] = useState(0.2);
  const [errors, setErrors] = useState<ValidationState>({});
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<AnalysisSuccess | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const searchParams = new URLSearchParams(window.location.search);
    const priceParam = searchParams.get('price');
    if (!priceParam) return;
    const parsed = Number(priceParam);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    setForm((prev) => ({
      ...prev,
      myPrice: prev.myPrice.trim().length > 0 ? prev.myPrice : String(round2(parsed))
    }));
  }, []);

  const parsed = useMemo(() => parseInputs(form), [form]);
  const urlValidation = useMemo(() => validateTrendyolUrl(form.url), [form.url]);
  const detectedMarketplace = useMemo(() => detectMarketplace(form.url), [form.url]);
  const isTrendyol = detectedMarketplace.marketplace === 'trendyol';

  const productLimitValid = parsed.productLimit !== null && parsed.productLimit > 0 && parsed.productLimit <= 50;

  const canRunAnalysis = useMemo(() => {
    return form.url.trim().length > 0 && isTrendyol && urlValidation.ok && !!form.sortMode && productLimitValid;
  }, [form.sortMode, form.url, isTrendyol, productLimitValid, urlValidation.ok]);

  const positionResult = useMemo<PositionResult | null>(() => {
    if (!analysisData) return null;
    if (!(parsed.myPrice > 0) || !(parsed.costPrice > 0)) return null;

    const netSales = parsed.myPrice / (1 + vatRate);
    const profit = netSales - parsed.costPrice - parsed.commission - parsed.shippingCost - parsed.advertisingCost;
    const average = analysisData.data.statistics.average_price;
    const economicMax = analysisData.data.segments.economic.max;
    const midMax = analysisData.data.segments.mid.max;

    let segment: PositionResult['segment'] = 'Premium bantta';
    let recommendation = 'Bu fiyat premium segmente yaklaşıyor. Ürün değerini net anlatmanız gerekir.';
    if (parsed.myPrice <= economicMax) {
      segment = 'Ekonomik bantta';
      recommendation = 'Bu fiyat daha erişilebilir segmentte konumlanıyor.';
    } else if (parsed.myPrice <= midMax) {
      segment = 'Orta bantta';
      recommendation = 'Bu fiyat pazardaki yoğun rekabet bandına yakın.';
    }

    const deltaFromAverage = round2(parsed.myPrice - average);
    const nearThreshold = Math.max(10, average * 0.01);
    const directionText =
      Math.abs(deltaFromAverage) <= nearThreshold
        ? 'Pazar ortalamasına yakın'
        : deltaFromAverage > 0
          ? `Pazar ortalamasından ${formatTry(Math.abs(deltaFromAverage))} daha yüksek`
          : `Pazar ortalamasından ${formatTry(Math.abs(deltaFromAverage))} daha düşük`;

    return {
      profit: round2(profit),
      segment,
      deltaFromAverage,
      directionText,
      recommendedBandText: `${formatTry(analysisData.data.segments.mid.min)} - ${formatTry(analysisData.data.segments.mid.max)}`,
      recommendation,
      markerPercent: toPercent(parsed.myPrice, analysisData.data.statistics.min_price, analysisData.data.statistics.max_price)
    };
  }, [analysisData, parsed, vatRate]);

  const onRunAnalysis = async () => {
    const nextErrors: ValidationState = {};

    if (!form.url.trim()) {
      nextErrors.url = 'Kategori linki girin.';
    } else if (!isTrendyol) {
      nextErrors.submit = 'Şu anda otomatik kategori analizi yalnızca Trendyol için aktif.';
    } else if (!urlValidation.ok) {
      nextErrors.url = urlValidation.reason ?? 'Geçerli bir Trendyol linki girin.';
    }

    if (!productLimitValid) {
      nextErrors.submit = 'Ürün limiti 1 ile 50 arasında olmalı.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setAnalysisLoading(true);
    setAnalysisError(null);
    setErrors({});
    try {
      const response = await fetch('/api/category-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: form.url.trim(),
          sortMode: form.sortMode,
          productLimit: Math.floor(parsed.productLimit ?? 20)
        })
      });

      const payload = (await response.json()) as AnalysisResponse;

      if (!response.ok || !payload.ok) {
        setAnalysisData(null);
        setAnalysisError(getCategoryAnalysisErrorMessage(payload.ok ? undefined : payload.reason));
        return;
      }

      setAnalysisData(payload);
      setAnalysisError(null);
    } catch {
      setAnalysisData(null);
      setAnalysisError(getCategoryAnalysisErrorMessage());
    } finally {
      setAnalysisLoading(false);
    }
  };

  const aiItems = useMemo<AiPanelItem[]>(() => {
    if (analysisLoading) {
      return [{ icon: 'spark', tone: 'neutral', text: 'Kategori analiz ediliyor...' }];
    }

    if (analysisError) {
      return [{ icon: 'alert', tone: 'danger', text: analysisError }];
    }

    if (!analysisData) {
      return [{ icon: 'info', tone: 'neutral', text: 'Kategori analiz edildiğinde pazar hakkında özet burada gösterilir.' }];
    }

    const items: AiPanelItem[] = [];
    if (analysisData.data.summary.summary_short_tr?.trim()) {
      items.push({
        icon: 'spark',
        tone: 'neutral',
        text: analysisData.data.summary.summary_short_tr.trim()
      });
    }

    for (const line of analysisData.data.summary.insights_tr ?? []) {
      const trimmed = line.trim();
      if (trimmed) {
        items.push({ icon: 'check', tone: 'success', text: trimmed });
      }
    }

    if (analysisData.partial) {
      items.push({
        icon: 'alert',
        tone: 'warning',
        text: 'Bazı ürün fiyatları eksik okunmuş olabilir.'
      });
    }

    return items.length > 0
      ? items.slice(0, 5)
      : [{ icon: 'info', tone: 'neutral', text: 'Kategori analiz edildiğinde pazar hakkında özet burada gösterilir.' }];
  }, [analysisData, analysisError, analysisLoading]);

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold text-slate-900">Rekabet Analizi — Fiyat Konumu</h1>
        <p className="mt-1 text-sm text-slate-600">Trendyol sonuçlarına göre fiyat bandını ve konumunu gör.</p>
        <p className="mt-1 text-xs text-slate-500">Linki kontrol et → senaryonu gir → analizi başlat</p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="card p-6">
          <div className="card-header">
            <h2 className="card-title">Ürün Senaryosu</h2>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Satış Fiyatı (₺)">
              <div className="rounded-xl border border-transparent p-1">
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className="input border-0 bg-white focus:border-0 focus:ring-0"
                  value={form.myPrice}
                  onChange={(event) => setForm((prev) => ({ ...prev, myPrice: event.target.value }))}
                />
              </div>
            </Field>

            <Field label="Maliyet (₺)">
              <div className="rounded-xl border border-transparent p-1">
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className="input border-0 bg-white focus:border-0 focus:ring-0"
                  value={form.costPrice}
                  onChange={(event) => setForm((prev) => ({ ...prev, costPrice: event.target.value }))}
                />
              </div>
            </Field>

            <Field label="Komisyon (₺)">
              <div className="rounded-xl border border-transparent p-1">
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className="input border-0 bg-white focus:border-0 focus:ring-0"
                  value={form.commission}
                  onChange={(event) => setForm((prev) => ({ ...prev, commission: event.target.value }))}
                />
              </div>
            </Field>

            <Field label="Kargo (₺)">
              <div className="rounded-xl border border-transparent p-1">
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className="input border-0 bg-white focus:border-0 focus:ring-0"
                  value={form.shippingCost}
                  onChange={(event) => setForm((prev) => ({ ...prev, shippingCost: event.target.value }))}
                />
              </div>
            </Field>

            <Field label="Reklam (₺)">
              <div className="rounded-xl border border-transparent p-1">
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className="input border-0 bg-white focus:border-0 focus:ring-0"
                  value={form.advertisingCost}
                  onChange={(event) => setForm((prev) => ({ ...prev, advertisingCost: event.target.value }))}
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
                    min={0}
                    step={0.01}
                    className="input border-0 bg-white focus:border-0 focus:ring-0"
                    value={form.targetProfit}
                    onChange={(event) => setForm((prev) => ({ ...prev, targetProfit: event.target.value }))}
                  />
                </div>
              </div>
            </Field>
          </div>

          <div className="mt-3">
            <p className="text-sm text-slate-700">KDV Oranı</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {[
                { mode: '20' as const, label: '%20', rate: 0.2 },
                { mode: '10' as const, label: '%10', rate: 0.1 },
                { mode: '1' as const, label: '%1', rate: 0.01 }
              ].map((item) => (
                <button
                  key={item.mode}
                  type="button"
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                    vatMode === item.mode ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                  onClick={() => {
                    setVatMode(item.mode);
                    setVatRate(item.rate);
                  }}
                >
                  {item.label}
                </button>
              ))}
              <label className="flex items-center gap-2 text-xs text-slate-700">
                <button
                  type="button"
                  className={`rounded-lg border px-2.5 py-1.5 font-semibold ${
                    vatMode === 'custom' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                  onClick={() => {
                    setVatMode('custom');
                    const parsedCustom = Number(customVatPercent);
                    setVatRate(clamp(Number.isFinite(parsedCustom) ? parsedCustom / 100 : 0, 0, 1));
                  }}
                >
                  Diğer
                </button>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                  value={customVatPercent}
                  disabled={vatMode !== 'custom'}
                  onChange={(event) => {
                    const value = event.target.value;
                    setCustomVatPercent(value);
                    setVatMode('custom');
                    const parsedCustom = Number(value);
                    setVatRate(clamp(Number.isFinite(parsedCustom) ? parsedCustom / 100 : 0, 0, 1));
                  }}
                />
              </label>
            </div>
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
              {form.url.trim() ? (
                <p className="helper-text text-xs text-slate-600">
                  {detectedMarketplace.marketplace === 'unknown' ? 'Kaynak algılanamadı.' : `Algılanan kaynak: ${detectedMarketplace.label}`}
                </p>
              ) : null}
              {form.url.trim() && detectedMarketplace.marketplace !== 'unknown' && !detectedMarketplace.supported ? (
                <p className="helper-text text-xs text-slate-500">Bu kaynak algılandı ancak şu an yalnızca Trendyol analizi aktif.</p>
              ) : null}
              {!form.url.trim() ? <p className="helper-text text-xs text-slate-500">Örnek: {EXAMPLE_TRENDYOL_SR_URL}</p> : null}
              {form.url.trim() && isTrendyol && !urlValidation.ok ? <p className="error-text text-xs text-rose-600">{errors.url ?? urlValidation.reason}</p> : null}
              {form.url.trim() && isTrendyol && urlValidation.ok ? <p className="success-text text-xs text-emerald-600">Geçerli Trendyol linki</p> : null}
            </Field>

            <div className="space-y-2 text-sm text-slate-700">
              <p>Sıralama Modu</p>
              <div className="flex flex-wrap gap-2">
                {SORT_MODE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`btn ${form.sortMode === option.value ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setForm((prev) => ({ ...prev, sortMode: option.value }))}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <Field label="Ürün Limiti">
              <input
                type="number"
                min={1}
                max={50}
                step={1}
                className="input"
                value={form.productLimit}
                onChange={(event) => setForm((prev) => ({ ...prev, productLimit: event.target.value }))}
              />
            </Field>

            {analysisError ? <p className="error-text text-sm text-rose-600">{analysisError}</p> : null}
            {errors.submit ? <p className="error-text text-sm text-rose-600">{errors.submit}</p> : null}

            <button
              type="button"
              className="btn btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
              onClick={onRunAnalysis}
              disabled={!canRunAnalysis || analysisLoading}
            >
              {analysisLoading ? 'Analiz Yapılıyor...' : 'Analizi Başlat'}
            </button>
          </div>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <AiPanel title="AI Analiz" items={aiItems} />

          <section className="card p-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="card-title">Kategori Özeti</h3>
            </div>

            {analysisData ? (
              <>
                <div className="mt-3 grid gap-2 text-sm text-slate-700">
                  <StatRow label="En düşük fiyat" value={formatTry(analysisData.data.statistics.min_price)} />
                  <StatRow label="Pazar ortalaması" value={formatTry(analysisData.data.statistics.average_price)} />
                  <StatRow label="En yüksek fiyat" value={formatTry(analysisData.data.statistics.max_price)} />
                </div>

                <p className="mt-4 text-xs font-medium text-slate-600">Fiyat yoğunluğu</p>
                <SegmentDistributionBar
                  economic={analysisData.data.segments.economic}
                  mid={analysisData.data.segments.mid}
                  premium={analysisData.data.segments.premium}
                />
                <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                  <Pill label="Ekonomik" value={`${formatTry(analysisData.data.segments.economic.min)} - ${formatTry(analysisData.data.segments.economic.max)}`} />
                  <Pill label="Orta" value={`${formatTry(analysisData.data.segments.mid.min)} - ${formatTry(analysisData.data.segments.mid.max)}`} />
                  <Pill label="Premium" value={`${formatTry(analysisData.data.segments.premium.min)} - ${formatTry(analysisData.data.segments.premium.max)}`} />
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-500">Kategori analizinden sonra fiyat özeti burada görünür.</p>
            )}
          </section>

          <section className="card p-5">
            <h3 className="card-title">Senin Konumun</h3>

            {positionResult ? (
              <div className="mt-3 space-y-4 text-sm text-slate-700">
                <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div>
                    <p className="text-xs text-slate-500">Senin fiyatın</p>
                    <p className="number-display text-lg font-semibold text-slate-900">{formatTry(parsed.myPrice)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Tahmini net kâr</p>
                    <p className={`number-display text-base font-semibold ${positionResult.profit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {formatTry(positionResult.profit)}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="absolute inset-0 flex">
                      <div className="h-full bg-emerald-200/80" style={{ width: '33.333%' }} />
                      <div className="h-full bg-slate-300/80" style={{ width: '33.333%' }} />
                      <div className="h-full bg-indigo-200/80" style={{ width: '33.333%' }} />
                    </div>
                    <div
                      className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-slate-900 shadow"
                      style={{ left: `${positionResult.markerPercent}%` }}
                    />
                  </div>
                  <div className="mt-2 grid grid-cols-3 text-[11px] font-medium text-slate-500">
                    <span className="text-left">Ekonomik</span>
                    <span className="text-center">Orta</span>
                    <span className="text-right">Premium</span>
                  </div>
                </div>

                <p>{positionResult.directionText}.</p>
                <p>
                  Önerilen fiyat bandı: <span className="font-semibold text-slate-900">{positionResult.recommendedBandText}</span>
                </p>
                <p>{positionResult.recommendation}</p>
                <p className="text-xs text-slate-500">Kâr hesapları KDV hariç satış tutarı üzerinden yapılır.</p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">Analiz sonrası ürününüzün bu kategorideki fiyat konumu burada gösterilir.</p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
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

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="number-display text-sm font-semibold text-slate-900">{value}</span>
    </p>
  );
}

function SegmentDistributionBar({
  economic,
  mid,
  premium
}: {
  economic: { min: number; max: number };
  mid: { min: number; max: number };
  premium: { min: number; max: number };
}) {
  const e = Math.max(0, economic.max - economic.min);
  const m = Math.max(0, mid.max - mid.min);
  const p = Math.max(0, premium.max - premium.min);
  const total = e + m + p || 1;

  const ePct = (e / total) * 100;
  const mPct = (m / total) * 100;
  const pPct = (p / total) * 100;

  return (
    <div className="mt-2">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-full bg-emerald-200/80" style={{ width: `${ePct}%` }} />
        <div className="h-full bg-slate-300/80" style={{ width: `${mPct}%` }} />
        <div className="h-full bg-indigo-200/80" style={{ width: `${pPct}%` }} />
      </div>
      <div className="mt-2 grid grid-cols-3 text-[11px] font-medium text-slate-500">
        <span className="text-left">Ekonomik</span>
        <span className="text-center">Orta</span>
        <span className="text-right">Premium</span>
      </div>
    </div>
  );
}

function parseInputs(form: FormState) {
  const rawProductLimit = form.productLimit.trim();
  const parsedProductLimit = Number(rawProductLimit);

  return {
    productLimit: rawProductLimit.length > 0 && Number.isFinite(parsedProductLimit) ? parsedProductLimit : null,
    myPrice: parseNumber(form.myPrice),
    costPrice: parseNumber(form.costPrice),
    commission: parseNumber(form.commission),
    shippingCost: parseNumber(form.shippingCost),
    advertisingCost: parseNumber(form.advertisingCost),
    targetProfit: parseNumber(form.targetProfit)
  };
}

function parseNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function toPercent(value: number, min: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max) || max <= min) return 50;
  const ratio = (value - min) / (max - min);
  return Math.min(100, Math.max(0, ratio * 100));
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function getCategoryAnalysisErrorMessage(reason?: string): string {
  if (reason === 'html_fetch_status_404') return 'Sayfa bulunamadı. Linki kontrol edin.';
  if (reason === 'blocked_or_rate_limited_403') return 'Pazaryeri şu anda analize izin vermedi. Birkaç dakika sonra tekrar deneyin.';
  if (reason === 'AI response validation failed') return 'Analiz verisi okunamadı. Tekrar deneyin.';
  if (reason === 'No valid products extracted') return 'Bu sayfadan yeterli ürün verisi alınamadı. Farklı bir kategori linki deneyin.';
  if (reason === 'Gemini fetch failed') return 'Analiz servisine ulaşılamadı. Tekrar deneyin.';
  return 'Kategori analizi alınamadı.';
}
