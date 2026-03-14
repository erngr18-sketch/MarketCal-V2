'use client';

import { Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AiPanel, type AiPanelItem } from '@/app/components/ai-panel';
import { ScenarioSaveControl } from '@/app/components/scenario-save-control';
import { normalizeFiniteNumber } from '@/lib/security/input-sanitize';

type ProductMode = 'best_sellers' | 'most_reviewed';

type ProductFormState = {
  mode: ProductMode;
  salesPrice: string;
  costPrice: string;
  commissionRate: string;
  shippingCost: string;
  advertisingCost: string;
  targetProfit: string;
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

type ProductAnalysisSnapshot = {
  analysis: ProductAnalysisResult;
  parsed: ReturnType<typeof parseProductInputs>;
};

const INITIAL_STATE: ProductFormState = {
  mode: 'best_sellers',
  salesPrice: '',
  costPrice: '',
  commissionRate: '20',
  shippingCost: '0',
  advertisingCost: '0',
  targetProfit: '15',
  productUrl: ''
};

export default function CompetitionProductPage() {
  const [form, setForm] = useState<ProductFormState>(INITIAL_STATE);
  const [analysis, setAnalysis] = useState<ProductAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalyzedKey, setLastAnalyzedKey] = useState<string | null>(null);
  const [analysisSnapshot, setAnalysisSnapshot] = useState<ProductAnalysisSnapshot | null>(null);

  const linkValidation = useMemo(() => validateTrendyolProductUrl(form.productUrl), [form.productUrl]);
  const parsed = useMemo(() => parseProductInputs(form), [form]);
  const analysisKey = useMemo(
    () =>
      JSON.stringify({
        mode: form.mode,
        salesPrice: parsed.salesPrice,
        costPrice: parsed.costPrice,
        commissionRate: parsed.commissionRate,
        shippingCost: parsed.shippingCost,
        advertisingCost: parsed.advertisingCost,
        targetProfit: parsed.targetProfit,
        productUrl: form.productUrl.trim()
      }),
    [form.mode, form.productUrl, parsed.advertisingCost, parsed.commissionRate, parsed.costPrice, parsed.salesPrice, parsed.shippingCost, parsed.targetProfit]
  );

  const canAnalyze =
    form.productUrl.trim().length > 0 &&
    linkValidation.ok &&
    parsed.salesPrice > 0 &&
    parsed.costPrice > 0 &&
    parsed.targetProfit >= 0 &&
    parsed.commissionValid;
  const hasFreshResult = analysis !== null && lastAnalyzedKey === analysisKey;
  const scenarioReady = parsed.salesPrice > 0 && parsed.costPrice > 0 && parsed.targetProfit >= 0 && parsed.commissionValid;
  const linkReady = form.productUrl.trim().length > 0 && linkValidation.ok;

  const ctaState = useMemo(() => {
    if (isAnalyzing) {
      return { label: 'Analiz Ediliyor...', helper: '', disabled: true };
    }

    if (!linkReady && !scenarioReady) {
      return {
        label: 'Senaryo bilgileri bekleniyor',
        helper: 'Ürün linki ile fiyat, maliyet ve temel gider alanlarını tamamlayın.',
        disabled: true
      };
    }

    if (!linkReady) {
      return {
        label: 'Link tanımı bekleniyor',
        helper: form.productUrl.trim() ? 'Geçerli bir ürün linki girin.' : 'Ürün linki ekleyin.',
        disabled: true
      };
    }

    if (!scenarioReady) {
      return {
        label: 'Senaryo bilgileri bekleniyor',
        helper: 'Fiyat, maliyet, komisyon ve temel gider alanlarını tamamlayın.',
        disabled: true
      };
    }

    if (hasFreshResult) {
      return {
        label: 'Sonuçlar güncel',
        helper: '',
        disabled: true
      };
    }

    return { label: 'Analizi Başlat', helper: '', disabled: false };
  }, [form.productUrl, hasFreshResult, isAnalyzing, linkReady, scenarioReady]);

  const productAiItems = useMemo(() => buildProductAiItems({ snapshot: analysisSnapshot }), [analysisSnapshot]);

  const onAnalyze = async () => {
    if (isAnalyzing || !canAnalyze) return;

    setIsAnalyzing(true);
    try {
      const [nextAnalysis] = await Promise.all([
        Promise.resolve().then(() => {
          const fakePrices = generateFakeCompetitorPrices(`${form.productUrl.trim()}|${form.mode}`);
          const stats = computeStats(fakePrices);
          const percentile = Math.round(positionPercent(parsed.salesPrice, stats.min, stats.max));
          const bandLabel = parsed.salesPrice < stats.lowerQuartile ? 'Ucuz Konum' : parsed.salesPrice > stats.upperQuartile ? 'Pahalı Konum' : 'Dengeli Konum';

          const aiLines = buildProductAiLines({
            myPrice: parsed.salesPrice,
            targetProfit: parsed.targetProfit,
            costPrice: parsed.costPrice,
            commissionRate: parsed.commissionRate,
            shippingCost: parsed.shippingCost,
            advertisingCost: parsed.advertisingCost,
            stats,
            bandLabel
          });

          return {
            min: stats.min,
            max: stats.max,
            lowerQuartile: stats.lowerQuartile,
            median: stats.median,
            upperQuartile: stats.upperQuartile,
            myPrice: parsed.salesPrice,
            percentile,
            bandLabel,
            aiLines
          };
        }),
        new Promise((resolve) => setTimeout(resolve, 900))
      ]);

      setAnalysis(nextAnalysis);
      setAnalysisSnapshot({
        analysis: nextAnalysis,
        parsed
      });
      setLastAnalyzedKey(analysisKey);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="space-y-1.5">
        <h1 className="text-2xl font-semibold text-slate-900">Fiyat Konumu</h1>
        <p className="text-sm text-slate-600">Ürün fiyatını benzer sonuçlarla karşılaştırarak pazardaki konumunu ve kârlılığını değerlendir.</p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-6">
          <section className="card min-h-[356px] p-6">
            <div className="card-header">
              <h2 className="card-title">Ürün Senaryosu</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1.5 text-sm text-slate-700">
                <span>Satış Fiyatı (₺)</span>
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
              <label className="space-y-1.5 text-sm text-slate-700">
                <span>Kargo (₺)</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className="input"
                  value={form.shippingCost}
                  placeholder="Varsa kargo maliyeti"
                  onChange={(event) => setForm((prev) => ({ ...prev, shippingCost: event.target.value }))}
                />
              </label>
              <label className="space-y-1.5 text-sm text-slate-700">
                <span>Reklam (₺)</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className="input"
                  value={form.advertisingCost}
                  placeholder="Varsa reklam maliyeti"
                  onChange={(event) => setForm((prev) => ({ ...prev, advertisingCost: event.target.value }))}
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
                <p className="success-text text-xs text-emerald-600">Geçerli Trendyol linki</p>
              ) : (
                <p className="error-text text-xs text-rose-600">Geçersiz link. Örnek: https://www.trendyol.com/marka/urun-adi-p-123456</p>
              )}

              <button type="button" className="btn btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50" onClick={onAnalyze} disabled={ctaState.disabled}>
                <span className="inline-flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  <span>{ctaState.label}</span>
                </span>
              </button>
              {ctaState.helper ? <p className="helper-text text-xs text-slate-500">{ctaState.helper}</p> : null}
            </div>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <AiPanel items={productAiItems} />

          <section className="card p-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="card-title">Pazar Konumu</h3>
              {analysisSnapshot ? <ProductRankBadge statusLabel={productStatusLabel(analysisSnapshot.parsed)} /> : null}
            </div>
            {analysisSnapshot ? (
              <>
                <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Net Kâr</p>
                    <p className="mt-1 text-3xl font-semibold text-slate-900">{formatTry(estimatedNetProfit(analysisSnapshot.parsed))}</p>
                  </div>
                  <div className="text-right" />
                </div>

                <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
                  <MetricRow label="Hedef Kâr" value={formatTry(analysisSnapshot.parsed.targetProfit)} />
                  <MetricRow
                    label={targetGapLabel(productTargetGap(analysisSnapshot.parsed))}
                    value={formatTry(Math.abs(productTargetGap(analysisSnapshot.parsed)))}
                    tone={productTargetGap(analysisSnapshot.parsed) <= 0 ? 'success' : 'warning'}
                  />
                  <MetricRow label="Satış Fiyatı" value={formatTry(analysisSnapshot.analysis.myPrice)} />
                </div>

                <div className="mt-5">
                  <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    <BandSegment
                      label="Alt Bant"
                      value={formatTry(analysisSnapshot.analysis.lowerQuartile)}
                      active={productBandKey(analysisSnapshot.analysis) === 'low'}
                      tone="low"
                    />
                    <BandSegment
                      label="Orta Bant"
                      value={formatTry(analysisSnapshot.analysis.median)}
                      active={productBandKey(analysisSnapshot.analysis) === 'mid'}
                      tone="mid"
                    />
                    <BandSegment
                      label="Üst Bant"
                      value={formatTry(analysisSnapshot.analysis.upperQuartile)}
                      active={productBandKey(analysisSnapshot.analysis) === 'high'}
                      tone="high"
                    />
                  </div>
                </div>

                <div className="mt-5 border-t border-slate-200 pt-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-indigo-500" />
                    <p className="text-sm font-semibold text-slate-900">AI Analiz</p>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{buildProductMarketComment(analysisSnapshot.analysis.bandLabel)}</p>
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-500">Analiz sonrası fiyat konumu burada gösterilir.</p>
            )}
          </section>

          <ScenarioSaveControl
            type="price_position"
            enabled={Boolean(analysisSnapshot)}
            inputs={{
              mode: form.mode,
              salesPrice: analysisSnapshot?.parsed.salesPrice ?? parsed.salesPrice,
              costPrice: analysisSnapshot?.parsed.costPrice ?? parsed.costPrice,
              commissionRate: analysisSnapshot?.parsed.commissionRate ?? parsed.commissionRate,
              shippingCost: analysisSnapshot?.parsed.shippingCost ?? parsed.shippingCost,
              advertisingCost: analysisSnapshot?.parsed.advertisingCost ?? parsed.advertisingCost,
              targetProfit: analysisSnapshot?.parsed.targetProfit ?? parsed.targetProfit,
              productUrl: form.productUrl
            }}
            result={{
              band: analysisSnapshot?.analysis.bandLabel ?? null,
              netProfit: analysisSnapshot ? estimatedNetProfit(analysisSnapshot.parsed) : null,
              targetGap: analysisSnapshot ? estimatedNetProfit(analysisSnapshot.parsed) - analysisSnapshot.parsed.targetProfit : null,
              summary: analysisSnapshot ? analysisSnapshot.analysis.aiLines.join(' ') : null
            }}
            aiSummary={analysisSnapshot ? analysisSnapshot.analysis.aiLines.join(' ') : null}
          />
        </aside>
      </div>
    </div>
  );
}

function parseProductInputs(form: ProductFormState) {
  const commissionRate = parseNumber(form.commissionRate);
  return {
    salesPrice: parseNumber(form.salesPrice),
    costPrice: parseNumber(form.costPrice),
    commissionRate,
    shippingCost: parseNumber(form.shippingCost),
    advertisingCost: parseNumber(form.advertisingCost),
    targetProfit: parseNumber(form.targetProfit),
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
  shippingCost,
  advertisingCost,
  stats,
  bandLabel
}: {
  myPrice: number;
  targetProfit: number;
  costPrice: number;
  commissionRate: number;
  shippingCost: number;
  advertisingCost: number;
  stats: ReturnType<typeof computeStats>;
  bandLabel: string;
}) {
  const effectivePrice = myPrice;
  const commissionRateDecimal = clamp(commissionRate / 100, 0, 0.9999);
  const commission = effectivePrice * commissionRateDecimal;
  const estimatedNet = effectivePrice - costPrice - commission - shippingCost - advertisingCost;

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
  return normalizeFiniteNumber(value, {
    fallback: 0,
    min: 0,
    max: 100000000,
    precision: 2
  });
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

function buildProductAiItems({
  snapshot
}: {
  snapshot: ProductAnalysisSnapshot | null;
}): AiPanelItem[] {
  if (!snapshot) {
    return [
      { icon: 'info', tone: 'neutral', text: 'Not: Analiz için urun linki ve senaryo alanlarını tamamlayın.' },
      { icon: 'target', tone: 'neutral', title: 'Durum', reason: 'Ürünün pazardaki bandı analizden sonra burada özetlenir.', text: 'Durum' },
      { icon: 'check', tone: 'neutral', title: 'Kârlılık', reason: 'Net kâr ve hedef farkı analiz sonrasında görünür olur.', text: 'Kârlılık' },
      { icon: 'alert', tone: 'neutral', title: 'Risk', reason: 'Fiyat bandına göre dikkat edilmesi gereken notlar burada yer alır.', text: 'Risk' }
    ];
  }

  const { analysis, parsed } = snapshot;
  const netProfit = estimatedNetProfit(parsed);
  const gap = productTargetGap(parsed);

  return [
    {
      icon: 'target',
      tone: gap <= 0 ? 'success' : netProfit >= 0 ? 'warning' : 'danger',
      title: 'Durum',
      reason:
        gap <= 0
          ? 'Hedef kâr karşılanıyor.'
          : netProfit >= 0
            ? 'Senaryo pozitif ama hedef kârın altında kalıyor.'
            : 'Senaryo mevcut varsayımlarla zarar riski taşıyor.',
      inlineTitle: true,
      text: 'Durum'
    },
    {
      icon: 'check',
      tone: netProfit >= 0 ? 'success' : 'danger',
      title: 'Kârlılık',
      reason: `Tahmini net kâr ${formatTry(netProfit)} seviyesinde.`,
      inlineTitle: true,
      text: 'Kârlılık'
    },
    {
      icon: 'alert',
      tone: analysis.bandLabel === 'Pahalı Konum' ? 'warning' : analysis.bandLabel === 'Ucuz Konum' ? 'danger' : 'neutral',
      title: 'Risk',
      reason: buildProductRiskText(analysis.bandLabel, gap),
      inlineTitle: true,
      text: 'Risk'
    }
  ];
}

function estimatedNetProfit(parsed: ReturnType<typeof parseProductInputs>) {
  const commission = parsed.salesPrice * clamp(parsed.commissionRate / 100, 0, 0.9999);
  return parsed.salesPrice - parsed.costPrice - commission - parsed.shippingCost - parsed.advertisingCost;
}

function productTargetGap(parsed: ReturnType<typeof parseProductInputs>) {
  return parsed.targetProfit - estimatedNetProfit(parsed);
}

function buildProductRiskText(bandLabel: string, gap: number) {
  if (bandLabel === 'Pahalı Konum') {
    return 'Fiyat üst banda yakın. Dönüşüm tarafını küçük testlerle izle.';
  }
  if (bandLabel === 'Ucuz Konum') {
    return gap <= 0 ? 'Alt bantta görünürlük avantajı var; marjı korumaya odaklan.' : 'Alt bantta olsan da hedef kâr için marjı kontrol et.';
  }
  return 'Orta bant daha dengeli bir başlangıç sunar; küçük fiyat testleri yeterli olabilir.';
}

function buildProductMarketComment(bandLabel: string) {
  if (bandLabel === 'Pahalı Konum') {
    return 'Fiyatın pazarın üst bandına yakın görünüyor. Dönüşüm tarafını küçük testlerle izle.';
  }
  if (bandLabel === 'Ucuz Konum') {
    return 'Fiyatın pazarın alt bandına yakın görünüyor. Görünürlük avantajını korurken marjı yakından izle.';
  }
  return 'Fiyatın orta seviyeye yakın. Bu seviye genelde daha dengeli bir başlangıç sunar.';
}

function MetricRow({
  label,
  value,
  tone = 'neutral'
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'success' | 'warning';
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <p className="text-sm text-slate-600">{label}</p>
      <p className={tone === 'success' ? 'text-sm font-semibold text-emerald-700' : tone === 'warning' ? 'text-sm font-semibold text-amber-700' : 'text-sm font-semibold text-slate-900'}>
        {value}
      </p>
    </div>
  );
}

function BandSegment({
  label,
  value,
  active,
  tone
}: {
  label: string;
  value: string;
  active: boolean;
  tone: 'low' | 'mid' | 'high';
}) {
  const activeClass =
    tone === 'low'
      ? 'bg-rose-100 text-rose-700'
      : tone === 'mid'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-emerald-100 text-emerald-700';

  return (
    <div className={`px-3 py-3 text-center ${active ? activeClass : 'bg-white text-slate-600'} ${tone !== 'high' ? 'border-r border-slate-200' : ''}`}>
      <p className="text-[11px] font-medium uppercase tracking-[0.08em]">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function ProductRankBadge({ statusLabel }: { statusLabel: string }) {
  if (statusLabel === 'Hedefte') {
    return <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">🟢 Hedefte</span>;
  }
  if (statusLabel === 'Sınırda') {
    return <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">🟠 Sınırda</span>;
  }
  return <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">🔴 Zararda</span>;
}

function productBandKey(analysis: ProductAnalysisResult) {
  if (analysis.myPrice < analysis.lowerQuartile) return 'low';
  if (analysis.myPrice <= analysis.upperQuartile) return 'mid';
  return 'high';
}

function productStatusLabel(parsed: ReturnType<typeof parseProductInputs>) {
  const gap = productTargetGap(parsed);
  const netProfit = estimatedNetProfit(parsed);
  if (netProfit < 0) return 'Zararda';
  if (gap <= 0) return 'Hedefte';
  return 'Sınırda';
}

function targetGapLabel(distanceToTarget: number) {
  return distanceToTarget <= 0 ? 'Hedefin Üzerinde' : 'Hedefe Kalan';
}
