'use client';

import { useMemo, useState } from 'react';
import { AiPanel, type AiPanelItem } from '@/app/components/ai-panel';

type ProductMode = 'best_sellers' | 'most_reviewed';
type VatMode = '20' | '10' | '1' | 'custom';

type ProductFormState = {
  mode: ProductMode;
  salesPrice: string;
  costPrice: string;
  targetProfit: string;
  commissionRate: string;
  productUrl: string;
};

type ProductAnalysisResult = {
  min: number;
  max: number;
  lowerQuartile: number;
  median: number;
  upperQuartile: number;
  myPrice: number;
  percentile: number;
  bandLabel: string;
  aiLines: string[];
};

const INITIAL_STATE: ProductFormState = {
  mode: 'best_sellers',
  salesPrice: '',
  costPrice: '',
  targetProfit: '15',
  commissionRate: '20',
  productUrl: ''
};

export default function CompetitionProductPage() {
  const [form, setForm] = useState<ProductFormState>(INITIAL_STATE);
  const [analysis, setAnalysis] = useState<ProductAnalysisResult | null>(null);
  const [vatMode, setVatMode] = useState<VatMode>('20');
  const [customVatPercent, setCustomVatPercent] = useState('20');
  const [vatRate, setVatRate] = useState(0.2);

  const linkValidation = useMemo(() => validateTrendyolProductUrl(form.productUrl), [form.productUrl]);
  const parsed = useMemo(() => parseProductInputs(form), [form]);
  const estimatedNetProfit = useMemo(() => {
    const netSales = parsed.salesPrice / (1 + vatRate);
    const commission = netSales * clamp(parsed.commissionRate / 100, 0, 0.9999);
    const shipping = 0;
    const ads = 0;
    return netSales - parsed.costPrice - commission - shipping - ads;
  }, [parsed, vatRate]);

  const canAnalyze =
    form.productUrl.trim().length > 0 &&
    linkValidation.ok &&
    parsed.salesPrice > 0 &&
    parsed.costPrice > 0 &&
    parsed.targetProfit >= 0 &&
    parsed.commissionValid;

  const onAnalyze = () => {
    if (!canAnalyze) return;

    const fakePrices = generateFakeCompetitorPrices(`${form.productUrl.trim()}|${form.mode}`);
    const stats = computeStats(fakePrices);
    const percentile = Math.round(positionPercent(parsed.salesPrice, stats.min, stats.max));
    const bandLabel = parsed.salesPrice < stats.lowerQuartile ? 'Ucuz Konum' : parsed.salesPrice > stats.upperQuartile ? 'Pahalı Konum' : 'Dengeli Konum';

    const aiLines = buildProductAiLines({
      myPrice: parsed.salesPrice,
      targetProfit: parsed.targetProfit,
      costPrice: parsed.costPrice,
      commissionRate: parsed.commissionRate,
      vatRate,
      stats,
      bandLabel
    });

    setAnalysis({
      min: stats.min,
      max: stats.max,
      lowerQuartile: stats.lowerQuartile,
      median: stats.median,
      upperQuartile: stats.upperQuartile,
      myPrice: parsed.salesPrice,
      percentile,
      bandLabel,
      aiLines
    });
  };

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold text-slate-900">Rekabet Analizi — Ürün Bazlı</h1>
        <p className="mt-1 text-sm text-slate-600">Trendyol sonuçlarına göre fiyat bandını ve konumunu gör.</p>
        <p className="mt-1 text-xs text-slate-500">Linki gir → senaryonu tamamla → analizi başlat</p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <section className="card p-6">
            <div className="card-header">
              <h2 className="card-title">Ürün Senaryosu</h2>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1.5 text-sm text-slate-700">
                <span>Satış Fiyatın (₺)</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className="input"
                  value={form.salesPrice}
                  onChange={(event) => setForm((prev) => ({ ...prev, salesPrice: event.target.value }))}
                />
              </label>
              <label className="space-y-1.5 text-sm text-slate-700">
                <span>Maliyet (₺)</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className="input"
                  value={form.costPrice}
                  onChange={(event) => setForm((prev) => ({ ...prev, costPrice: event.target.value }))}
                />
              </label>
              <label className="space-y-1.5 text-sm text-slate-700">
                <span>Komisyon (%)</span>
                <div className="rounded-xl border border-transparent p-1">
                  <input
                    type="number"
                    min={0}
                    max={99.99}
                    step={0.01}
                    className="input border-0 bg-white focus:border-0 focus:ring-0"
                    value={form.commissionRate}
                    onChange={(event) => setForm((prev) => ({ ...prev, commissionRate: event.target.value }))}
                  />
                </div>
                {!parsed.commissionValid ? <p className="error-text text-xs text-rose-600">Komisyon %100 üstü olamaz.</p> : null}
              </label>
              <label className="space-y-1.5 text-sm text-slate-700">
                <span>Hedef Kâr (₺)</span>
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
              </label>
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
          </section>

          <section className="card p-6">
            <div className="card-header">
              <h2 className="card-title">Ürün Seçimi</h2>
            </div>

            <div className="space-y-3">
              <label className="space-y-1.5 text-sm text-slate-700">
                <span>Trendyol Ürün Linki</span>
                <input
                  type="url"
                  className="input"
                  placeholder="https://www.trendyol.com/..."
                  value={form.productUrl}
                  onChange={(event) => {
                    setForm((prev) => ({ ...prev, productUrl: event.target.value }));
                  }}
                />
              </label>

              {form.productUrl.trim().length === 0 ? (
                <p className="helper-text text-xs text-slate-500">Örnek: https://www.trendyol.com/marka/urun-adi-p-123456</p>
              ) : linkValidation.ok ? (
                <p className="success-text text-sm text-emerald-600">Geçerli Trendyol linki</p>
              ) : (
                <p className="error-text text-sm text-rose-600">Geçersiz link. Örnek: https://www.trendyol.com/marka/urun-adi-p-123456</p>
              )}

              <button type="button" className="btn btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50" onClick={onAnalyze} disabled={!canAnalyze}>
                Analizi Başlat
              </button>
            </div>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <AiPanel items={(analysis?.aiLines ?? ['⏱️ Analiz için girdileri tamamlayın.']).map(mapAiLineToItem)} />

          <section className="card p-5">
            <h3 className="card-title">Pazar Konumu</h3>
            {analysis ? (
              <>
                <p className="mt-1 text-sm text-slate-600">{analysis.bandLabel} (%{analysis.percentile})</p>
                <div className="mt-4">
                  <div className="relative h-2 rounded-full bg-slate-100">
                    <RangeMarker left={positionPercent(analysis.lowerQuartile, analysis.min, analysis.max)} label="Alt Çeyrek" />
                    <RangeMarker left={positionPercent(analysis.median, analysis.min, analysis.max)} label="Orta Değer" />
                    <RangeMarker left={positionPercent(analysis.upperQuartile, analysis.min, analysis.max)} label="Üst Çeyrek" />
                    <div className="absolute -top-1.5 h-5 w-1 -translate-x-1/2 rounded bg-slate-900" style={{ left: `${positionPercent(analysis.myPrice, analysis.min, analysis.max)}%` }} />
                  </div>
                  <div className="mt-3 flex justify-between gap-3 text-xs text-slate-500">
                    <span>{formatTry(analysis.min)}</span>
                    <span className="whitespace-nowrap font-medium text-slate-700">Senin fiyatın: {formatTry(analysis.myPrice)}</span>
                    <span>{formatTry(analysis.max)}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">Tahmini net kâr: {formatTry(estimatedNetProfit)}</p>
                  <p className="mt-1 text-xs text-slate-500">Kâr hesapları KDV hariç satış tutarı üzerinden yapılır.</p>
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-500">Analiz sonrası fiyat konumu burada gösterilir.</p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function RangeMarker({ left, label }: { left: number; label: string }) {
  return (
    <div className="absolute top-2 -translate-x-1/2" style={{ left: `${left}%` }}>
      <div className="h-2 w-px bg-slate-300" />
      <span className="mt-1 block whitespace-nowrap text-[10px] text-slate-500">{label}</span>
    </div>
  );
}

function parseProductInputs(form: ProductFormState) {
  const commissionRate = parseNumber(form.commissionRate);
  return {
    salesPrice: parseNumber(form.salesPrice),
    costPrice: parseNumber(form.costPrice),
    targetProfit: parseNumber(form.targetProfit),
    commissionRate,
    commissionValid: commissionRate >= 0 && commissionRate < 100
  };
}

function validateTrendyolProductUrl(rawUrl: string) {
  const trimmed = rawUrl.trim();
  if (!trimmed) return { ok: false };

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false };
  }

  const host = parsed.hostname.toLowerCase();
  if (host !== 'trendyol.com' && host !== 'www.trendyol.com') {
    return { ok: false };
  }

  const path = parsed.pathname.toLowerCase();
  if (!path.includes('-p-')) {
    return { ok: false };
  }

  return { ok: true };
}

function generateFakeCompetitorPrices(seedInput: string) {
  const seed = hashString(seedInput);
  const rnd = createSeededRandom(seed);
  const base = 450 + rnd() * 350;

  return Array.from({ length: 20 }, () => {
    const delta = (rnd() - 0.5) * 240;
    return round2(Math.max(50, base + delta));
  }).sort((a, b) => a - b);
}

function computeStats(prices: number[]) {
  const sorted = [...prices].sort((a, b) => a - b);
  const min = sorted[0] ?? 0;
  const max = sorted[sorted.length - 1] ?? 0;
  const lowerQuartile = quantile(sorted, 0.25);
  const median = quantile(sorted, 0.5);
  const upperQuartile = quantile(sorted, 0.75);

  return {
    min: round2(min),
    max: round2(max),
    lowerQuartile: round2(lowerQuartile),
    median: round2(median),
    upperQuartile: round2(upperQuartile)
  };
}

function buildProductAiLines({
  myPrice,
  targetProfit,
  costPrice,
  commissionRate,
  vatRate,
  stats,
  bandLabel
}: {
  myPrice: number;
  targetProfit: number;
  costPrice: number;
  commissionRate: number;
  vatRate: number;
  stats: ReturnType<typeof computeStats>;
  bandLabel: string;
}) {
  const effectivePrice = myPrice;
  const netSales = effectivePrice / (1 + clamp(vatRate, 0, 1));
  const commissionRateDecimal = clamp(commissionRate / 100, 0, 0.9999);
  const commission = netSales * commissionRateDecimal;
  const shipping = 0;
  const ads = 0;
  const estimatedNet = netSales - costPrice - commission - shipping - ads;

  const lines = [`🧭 Ürün fiyat konumu: ${bandLabel}.`];

  if (bandLabel === 'Pahalı Konum') {
    lines.push('✅ Dönüşümü korumak için fiyatı veya kampanya görünürlüğünü küçük adımlarla test et.');
  } else if (bandLabel === 'Ucuz Konum') {
    lines.push('✅ Marjı güçlendirmek için fiyatı kademeli artırarak tepkiyi ölçebilirsin.');
  } else {
    lines.push('✅ Dengeli aralıkta görünüyorsun; marjı bozmadan küçük optimizasyonlarla ilerle.');
  }

  if (estimatedNet < targetProfit) {
    lines.push(`⚠️ Tahmini net kâr (${formatTry(estimatedNet)}) hedef kârın altında; maliyet ve fiyat varsayımlarını yeniden dengele.`);
  } else {
    lines.push(`⚠️ Tahmini net kâr (${formatTry(estimatedNet)}) hedefe yakın; komisyon ve maliyetleri panelden teyit et.`);
  }

  if (myPrice > stats.upperQuartile) {
    lines.push('⚠️ Üst çeyreğin üzerinde kaldığın için talep düşüş riskini kontrol et.');
  }

  return lines.slice(0, 4);
}

function positionPercent(value: number, min: number, max: number) {
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max) || max <= min) return 50;
  return clamp(((value - min) / (max - min)) * 100, 0, 100);
}

function quantile(values: number[], q: number) {
  if (values.length === 0) return 0;
  const pos = (values.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const next = values[base + 1] ?? values[base];
  return values[base] + rest * (next - values[base]);
}

function parseNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatTry(value: number) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 2
  }).format(Number.isFinite(value) ? value : 0);
}

function mapAiLineToItem(line: string): AiPanelItem {
  const trimmed = line.trim();
  if (trimmed.startsWith('✅')) return { text: trimmed.replace(/^✅\s*/, ''), icon: 'check', tone: 'success' };
  if (trimmed.startsWith('⚠️')) return { text: trimmed.replace(/^⚠️\s*/, ''), icon: 'alert', tone: 'warning' };
  if (trimmed.startsWith('🧭')) return { text: trimmed.replace(/^🧭\s*/, ''), icon: 'target', tone: 'neutral' };
  return { text: trimmed, icon: 'info', tone: 'neutral' };
}
