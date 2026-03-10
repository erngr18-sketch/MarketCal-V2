'use client';

import { useMemo, useState } from 'react';
import { AiPanel, type AiPanelItem } from '@/app/components/ai-panel';

type ProductMode = 'best_sellers' | 'most_reviewed';

type ProductFormState = {
  mode: ProductMode;
  salesPrice: string;
  costPrice: string;
  targetProfit: string;
  commissionRate: string;
  vatRate: string;
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
  vatRate: '20',
  productUrl: ''
};

const VAT_PRESETS = ['20', '10', '1'] as const;

export default function CompetitionProductPage() {
  const [form, setForm] = useState<ProductFormState>(INITIAL_STATE);
  const [analysis, setAnalysis] = useState<ProductAnalysisResult | null>(null);
  const isCustomVat = !VAT_PRESETS.includes(form.vatRate as (typeof VAT_PRESETS)[number]);

  const linkValidation = useMemo(() => validateTrendyolProductUrl(form.productUrl), [form.productUrl]);
  const parsed = useMemo(() => parseProductInputs(form), [form]);
  const summary = useMemo(() => calculateProfitSummary(parsed), [parsed]);

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
      vatRate: parsed.vatRate,
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
                <span>Hedef Kâr (₺)</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className="input"
                  value={form.targetProfit}
                  onChange={(event) => setForm((prev) => ({ ...prev, targetProfit: event.target.value }))}
                />
              </label>
              <label className="space-y-1.5 text-sm text-slate-700">
                <span>Komisyon (%)</span>
                <input
                  type="number"
                  min={0}
                  max={99.99}
                  step={0.01}
                  className="input"
                  value={form.commissionRate}
                  onChange={(event) => setForm((prev) => ({ ...prev, commissionRate: event.target.value }))}
                />
                {!parsed.commissionValid ? <p className="error-text text-xs text-rose-600">Komisyon %100 üstü olamaz.</p> : null}
              </label>
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
                  onClick={() => setForm((prev) => ({ ...prev, vatRate: isCustomVat ? prev.vatRate : '20' }))}
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
          <AiPanel items={(analysis?.aiLines ?? ['⏱️ Analiz için girdileri tamamlayın.', '⚠️ Hesaplama KDV hariç net satış üzerinden yapılır.']).map(mapAiLineToItem)} />

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
                </div>

                <div className="mt-4 grid gap-2">
                  <ResultBlock label="Net Satış (KDV Hariç)" value={formatTry(summary.netSales)} />
                  <ResultBlock label="Komisyon" value={formatTry(summary.commission)} />
                  <ResultBlock label="Net Kâr" value={formatTry(summary.netProfit)} emphasis />
                  <ResultBlock label="Hedef Kâr Farkı" value={summary.targetGapLabel} />
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-500">Analiz sonrası fiyat konumu ve kârlılık özeti burada gösterilir.</p>
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

function ResultBlock({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className={emphasis ? 'rounded-xl border border-slate-300 bg-white px-3 py-2 shadow-sm' : 'rounded-xl border border-slate-200 bg-slate-50 px-3 py-2'}>
      <p className={emphasis ? 'text-[11px] text-slate-600' : 'text-[11px] text-slate-500'}>{label}</p>
      <p className={emphasis ? 'number-display text-base font-semibold text-slate-900' : 'number-display text-sm font-semibold text-slate-900'}>{value}</p>
    </div>
  );
}

function parseProductInputs(form: ProductFormState) {
  const commissionRate = parseNumber(form.commissionRate);
  const vatRate = parseVatNumber(form.vatRate);
  return {
    salesPrice: parseNumber(form.salesPrice),
    costPrice: parseNumber(form.costPrice),
    targetProfit: parseNumber(form.targetProfit),
    commissionRate,
    vatRate,
    commissionValid: commissionRate >= 0 && commissionRate < 100
  };
}

function calculateProfitSummary(parsed: ReturnType<typeof parseProductInputs>) {
  const effectivePrice = parsed.salesPrice;
  const vatRateDecimal = parsed.vatRate / 100;
  const netSales = effectivePrice / (1 + vatRateDecimal);
  const commission = effectivePrice * (parsed.commissionRate / 100);
  const shippingCost = 0;
  const advertisingCost = 0;
  const netProfit = netSales - (parsed.costPrice + shippingCost + advertisingCost + commission);
  const targetGap = netProfit - parsed.targetProfit;

  return {
    netSales,
    commission,
    netProfit,
    targetGap,
    targetGapLabel: targetGap >= 0 ? 'Hedef kârı karşılıyor.' : 'Hedef kârın altında.'
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
  const netSales = effectivePrice / (1 + vatRate / 100);
  const commissionRateDecimal = clamp(commissionRate / 100, 0, 0.9999);
  const commission = effectivePrice * commissionRateDecimal;
  const estimatedNet = netSales - costPrice - commission;

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

  lines.push('⚠️ Hesaplama KDV hariç net satış üzerinden yapılır.');

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

function parseVatNumber(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 20;
  return Math.max(0, parsed);
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
