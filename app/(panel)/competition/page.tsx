'use client';

import { useEffect, useMemo, useState } from 'react';
import { AiPanel, type AiPanelItem } from '@/app/components/ai-panel';
import { DecisionHero, InfoNote, MetricCard } from '@/app/components/ui/clarity';
import { buildDeterministicSummary, stringifyDeterministicSummary } from '@/lib/listing-analysis/summary';
import type { CategoryAnalysisResponse, DeterministicSummary, ListingPriceStats } from '@/lib/listing-analysis/types';
import { formatTry, runCompetition, type CompetitionMode, type CompetitionOutput } from '@/lib/profit/competition-engine';
import { validateListingUrl } from '@/lib/listing-analysis/validate-url';
import { calculateVatAwarePricing } from '@/lib/profit/pricing-engine';

const EXAMPLE_TRENDYOL_SR_URL = 'https://www.trendyol.com/sr?qt=kazak&st=kazak';

type FormState = {
  listingUrl: string;
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
  listingUrl?: string;
  myPrice?: string;
  costPrice?: string;
  commissionRate?: string;
  manual?: string;
  submit?: string;
};

type ListingAnalysisState = {
  stats: ListingPriceStats;
  summary: string;
  pricesCount: number;
};

const INITIAL_STATE: FormState = {
  listingUrl: EXAMPLE_TRENDYOL_SR_URL,
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
  const [analysis, setAnalysis] = useState<ListingAnalysisState | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
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
  const urlValidation = useMemo(() => validateListingUrl(form.listingUrl), [form.listingUrl]);
  const isManualMode = form.manualOpen && parsed.manualValid;
  const displayStats = isManualMode ? result?.stats ?? null : analysis?.stats ?? result?.stats ?? null;
  const displaySummary = isManualMode ? '' : analysis?.summary ?? '';
  const displaySourceLabel = isManualMode ? 'Manual Veri' : analysis ? 'Gerçek Listing Analizi' : result ? 'Simülasyon' : '';
  const displayPercentile = displayStats ? Math.round(positionPercent(parsed.myPrice, displayStats.min, displayStats.max)) : null;
  const displayBandLabel = displayStats ? positionLabelByPrice(parsed.myPrice, displayStats) : null;
  const deterministicSummary = useMemo<DeterministicSummary | null>(() => {
    if (!displayStats || !displayBandLabel) return null;

    return buildDeterministicSummary({
      sourceType: result?.sourceType ?? 'trendyol',
      normalizedUrl: result?.normalizedUrl,
      stats: displayStats,
      myPrice: parsed.myPrice,
      bandLabel: displayBandLabel,
      segmentLabel: displayBandLabel,
      netProfit: profit.netProfit,
      targetGap: profit.targetGap,
      suggestedPrice: profit.suggestedPrice,
      pricesCount: analysis?.pricesCount,
      usedRealAnalysis: Boolean(analysis && !isManualMode),
      usedFallback: Boolean(!analysis)
    });
  }, [analysis, displayBandLabel, displayStats, isManualMode, parsed.myPrice, profit.netProfit, profit.suggestedPrice, profit.targetGap, result?.normalizedUrl, result?.sourceType]);

  const canRun = useMemo(() => {
    if (!urlValidation.ok) return false;
    if (!(parsed.myPrice > 0)) return false;
    if (parsed.costPrice < 0) return false;
    if (!parsed.commissionValid) return false;
    if (form.manualOpen && !parsed.manualValid) return false;
    return true;
  }, [form.manualOpen, parsed.commissionValid, parsed.costPrice, parsed.manualValid, parsed.myPrice, urlValidation.ok]);

  const decisionTitle = displayStats
    ? buildCompetitionDecisionTitle({
        bandLabel: displayBandLabel,
        netProfit: profit.netProfit,
        targetGap: profit.targetGap
      })
    : 'Önce linki ve senaryonu gir, ardından pazar konumu ile kâr özetini birlikte gör.';
  const decisionDetail = displayStats
    ? `${describeMarketPosition(displayPercentile ?? 50)} ${profit.targetGapHelper}`
    : 'Bu ekran 5 saniyede pazarda nerede olduğunu, kâr edip etmediğini ve hangi fiyatın hedefe yaklaştığını göstermek için düzenlendi.';
  const sourceDetail = displayStats
    ? analysis
      ? `${displaySourceLabel} • ${analysis.pricesCount} fiyat`
      : displaySourceLabel
    : 'Analiz bekleniyor';
  const warningText = deterministicSummary?.warning ?? 'Kesin hesaplanan veriler aşağıdadır. Yorumlar ayrı alanda yalnızca destek amaçlı gösterilir.';

  const onRunAnalysis = async () => {
    const nextErrors: ValidationState = {};

    if (!form.listingUrl.trim() || !urlValidation.ok) {
      nextErrors.listingUrl = urlValidation.reason ?? 'Geçerli bir Trendyol listing linki girin.';
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
      const fallbackOutput = runCompetition({
        listingUrl: form.listingUrl,
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

      setResult(fallbackOutput);
      setErrors({});

      if (useManual) {
        setAnalysis(null);
        return;
      }

      setIsAnalyzing(true);

      try {
        const response = await analyzeListing({
          listingUrl: form.listingUrl,
          myPrice: parsed.myPrice,
          netProfit: profit.netProfit,
          targetGap: profit.targetGap,
          suggestedPrice: profit.suggestedPrice
        });

        setAnalysis({
          stats: response.stats,
          summary: response.summary,
          pricesCount: response.pricesCount
        });
      } catch {
        setAnalysis(null);
      } finally {
        setIsAnalyzing(false);
      }
    } catch (error) {
      setAnalysis(null);
      setIsAnalyzing(false);
      setErrors({ submit: error instanceof Error ? error.message : 'Analiz sırasında hata oluştu.' });
    }
  };

  const aiItems = useMemo(() => {
    const items: AiPanelItem[] = [];
    const deterministicText = deterministicSummary ? stringifyDeterministicSummary(deterministicSummary) : '';

    if (deterministicSummary) {
      items.push({
        icon: 'spark',
        tone: 'neutral',
        text: deterministicSummary.headline,
        emphasis: true
      });

      for (const bullet of deterministicSummary.bullets) {
        items.push({
          icon: 'check',
          tone: 'neutral',
          text: bullet
        });
      }
    }

    if (isAnalyzing) {
      items.push({
        icon: 'spark',
        tone: 'neutral',
        text: 'Listing analiz ediliyor...',
        emphasis: true
      });
    }

    if (displaySummary && normalizePanelText(displaySummary) !== normalizePanelText(deterministicText)) {
      items.push({
        icon: 'info',
        tone: 'neutral',
        text: displaySummary,
        emphasis: false
      });
    }

    const profitability = profit.netProfit;
    const distance = profit.distanceToTarget;
    if (parsed.myPrice > 0 && parsed.costPrice > 0) {
      items.push({
        icon: profit.priceSufficientForTarget ? 'check' : 'target',
        tone: profit.priceSufficientForTarget ? 'success' : 'warning',
        text: profit.priceSufficientForTarget
          ? 'Mevcut fiyat hem pazarda makul hem de hedef kâr açısından yeterli görünüyor.'
          : 'Bu fiyat pazarda dengeli görünse de hedef kâr için satış fiyatını artırman gerekebilir.'
      });
      items.push({
        icon: distance <= 0 ? 'target' : 'alert',
        tone: distance <= 0 ? 'success' : 'warning',
        text:
          distance <= 0
            ? `Hedef kâr karşılanıyor (${profit.statusLabel}).`
            : `Hedefe uzaklık: ${formatTry(distance)} (${profit.statusLabel}).`
      });
      items.push({
        icon: profitability >= 0 ? 'check' : 'alert',
        tone: profitability >= 0 ? 'success' : 'danger',
        text:
          profitability >= 0
            ? `Maliyet ve gider varsayımıyla tahmini kâr: ${formatTry(profitability)}.`
            : `Maliyet ve gider varsayımıyla tahmini sonuç: ${formatTry(profitability)} (zarar riski).`
      });
      items.push({
        icon: 'check',
        tone: 'neutral',
        text: 'Hesaplama KDV hariç net satış üzerinden yapılır.'
      });
    }

    if (!analysis && result?.assistantMessage) {
      items.push(...result.assistantMessage.split('\n').map(mapAssistantLineToItem));
    }

    if (deterministicSummary) {
      items.push({
        icon: 'alert',
        tone: 'warning',
        text: deterministicSummary.warning
      });
    }

    const uniqueItems: AiPanelItem[] = [];
    const seen = new Set<string>();
    for (const item of items) {
      const normalizedText = item.text.trim().toLocaleLowerCase('tr');
      if (seen.has(normalizedText)) continue;
      seen.add(normalizedText);
      uniqueItems.push(item);
    }

    if (uniqueItems.length === 0) {
      return [{ icon: 'info' as const, tone: 'neutral' as const, text: '⏱️ Analiz için girdileri tamamlayın.' }];
    }

    return uniqueItems.slice(0, 5);
  }, [analysis, deterministicSummary, displaySummary, isAnalyzing, parsed, profit, result?.assistantMessage]);

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold text-slate-900">Fiyatın Pazarda Nerede?</h1>
        <p className="mt-1 text-sm text-slate-600">Trendyol sonuçlarına göre fiyatının pazarda hangi seviyede olduğunu gör.</p>
        <p className="mt-1 text-xs text-slate-500">Linki kontrol et → senaryonu gir → analizi başlat</p>
      </section>

      <DecisionHero
        eyebrow="Ana karar"
        title={decisionTitle}
        detail={decisionDetail}
        badge={displayBandLabel ? <CompetitionRankBadge segmentLabel={displayBandLabel} /> : undefined}
        metrics={[
          { label: 'Pazar konumu', value: displayBandLabel ?? '-', tone: marketToneByBand(displayBandLabel) },
          { label: 'Net kâr', value: formatTry(profit.netProfit), tone: toneByProfit(profit.netProfit) },
          { label: 'Hedef kâr farkı', value: formatTry(profit.targetGap), tone: toneByTargetGap(profit.targetGap) },
          { label: 'Önerilen fiyat', value: formatTry(profit.suggestedPrice), tone: 'accent' }
        ]}
      />

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
                max={80}
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
            <Field label="Listing Linki">
              <input
                type="url"
                className="input"
                value={form.listingUrl}
                onChange={(event) => setForm((prev) => ({ ...prev, listingUrl: event.target.value }))}
                placeholder={EXAMPLE_TRENDYOL_SR_URL}
              />
              {!form.listingUrl.trim() ? <p className="helper-text text-xs text-slate-500">Şu an Trendyol listing linkleri destekleniyor. Örnek: {EXAMPLE_TRENDYOL_SR_URL}</p> : null}
              {form.listingUrl.trim() && !urlValidation.ok ? <p className="error-text text-xs text-rose-600">{errors.listingUrl ?? urlValidation.reason}</p> : null}
              {form.listingUrl.trim() && urlValidation.ok ? <p className="success-text text-xs text-emerald-600">Geçerli listing linki</p> : null}
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
              disabled={!canRun || isAnalyzing}
            >
              {isAnalyzing ? 'Listing analiz ediliyor...' : 'Fiyatımı Analiz Et'}
            </button>
            {!canRun ? <p className="helper-text text-xs text-slate-500">Analizi başlatmak için link + fiyat + maliyet girin.</p> : null}
            {isAnalyzing ? <p className="helper-text text-xs text-slate-500">Gerçek listing fiyatları kontrol ediliyor.</p> : null}
            {form.manualOpen && !parsed.manualValid ? <p className="error-text text-xs text-rose-600">Manuel fiyatlarda düşük, orta ve yüksek sırası doğru olmalı.</p> : null}
          </div>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <section className="card p-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="card-title">Pazar özeti</h3>
              {displayBandLabel ? <CompetitionRankBadge segmentLabel={displayBandLabel} /> : null}
            </div>

            {displayStats ? (
              <>
                <p className="mt-1 text-sm text-slate-600">{describeMarketPosition(displayPercentile ?? 50)}</p>
                <div className="mt-4 grid gap-2">
                  <MetricCard label="Veri kaynağı" value={sourceDetail} />
                  <MetricCard label="Güven seviyesi" value={deterministicSummary?.confidenceLabel ?? 'Bekleniyor'} tone="neutral" />
                  <MetricCard label="Analiz edilen fiyat" value={analysis ? String(analysis.pricesCount) : '3+'} />
                </div>

                <div className="mt-4">
                  <div className="relative h-2 rounded-full bg-slate-100">
                    <div
                      className="absolute -top-1.5 h-5 w-1 -translate-x-1/2 rounded bg-slate-900"
                      style={{ left: `${positionPercent(parsed.myPrice, displayStats.min, displayStats.max)}%` }}
                    />
                  </div>

                  <div className="mt-3 grid gap-2">
                    <MetricCard label="Alt bant" value={formatTry(displayStats.q1)} />
                    <MetricCard label="Orta seviye" value={formatTry(displayStats.median)} tone="success" />
                    <MetricCard label="Üst bant" value={formatTry(displayStats.q3)} tone="warning" />
                  </div>
                  <p className="mt-2 text-xs font-medium text-slate-700">Senin fiyatın: {formatTry(parsed.myPrice)}</p>
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-500">Analizi başlattığında pazar konumu, güven seviyesi ve fiyat bantları burada görünür.</p>
            )}
          </section>

          <section className="card p-5">
            <h3 className="card-title">Kâr özeti</h3>
            <div className="mt-4 grid gap-2">
              <MetricCard label="Net satış" value={formatTry(profit.netSales)} />
              <MetricCard label="Net kâr" value={formatTry(profit.netProfit)} tone={toneByProfit(profit.netProfit)} emphasis />
              <MetricCard label="Hedef kâr farkı" value={formatTry(profit.targetGap)} tone={toneByTargetGap(profit.targetGap)} hint={profit.targetGapHelper} />
              <MetricCard label="Önerilen satış fiyatı" value={formatTry(profit.suggestedPrice)} tone="accent" hint={profit.suggestedPriceMessage} />
            </div>
          </section>

          <AiPanel
            title="Yorum ve öneriler"
            disclaimer="Bu bölüm yorumdur. Kesin hesaplanan veriler üstteki kartlarda gösterilir."
            items={aiItems}
          />

          <InfoNote label="Kontrol notu" text={warningText} tone="warning" />
          <InfoNote label="Hesap notu" text="Net satış ve net kâr hesapları KDV hariç baz alınır." />
        </aside>
      </div>
    </div>
  );
}

function CompetitionRankBadge({ segmentLabel }: { segmentLabel: string }) {
  if (segmentLabel === 'Alt Bant') {
    return <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">🟢 Alt Bant</span>;
  }
  if (segmentLabel === 'Orta Seviye') {
    return <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">🟡 Orta Seviye</span>;
  }
  return <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">🟠 Üst Bant</span>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1.5 text-sm text-slate-700">
      <span>{label}</span>
      {children}
    </label>
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
    commissionValid: commissionRate >= 0 && commissionRate <= 80,
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

function describeMarketPosition(percentile: number): string {
  if (percentile < 40) {
    return `Bu fiyat pazardaki ürünlerin yaklaşık %${percentile}'inden daha ucuz.`;
  }
  if (percentile <= 60) {
    return 'Bu fiyat pazardaki ürünlerin ortalama seviyesine yakın.';
  }
  return `Bu fiyat pazardaki ürünlerin yaklaşık %${percentile}'inden daha pahalı.`;
}

function buildCompetitionDecisionTitle({
  bandLabel,
  netProfit,
  targetGap
}: {
  bandLabel: string | null;
  netProfit: number;
  targetGap: number;
}) {
  if (netProfit < 0) return 'Bu fiyat mevcut giderlerle zarar riski taşıyor.';
  if (targetGap < 0) return 'Bu fiyat kâr bıraksa da hedef kâr açısından baskı yaratıyor.';
  if (bandLabel === 'Orta Seviye') return 'Fiyatın pazarın orta seviyesine yakın ve hedef kârı destekliyor.';
  if (bandLabel === 'Alt Bant') return 'Fiyatın pazarın alt bandında; marjı korumak için artış alanın olabilir.';
  return 'Fiyatın pazarın üst bandında; talep ve dönüşüm riskini takip etmelisin.';
}

function toneByProfit(value: number): 'success' | 'warning' | 'danger' {
  if (value < 0) return 'danger';
  if (value === 0) return 'warning';
  return 'success';
}

function toneByTargetGap(value: number): 'success' | 'warning' {
  return value >= 0 ? 'success' : 'warning';
}

function marketToneByBand(bandLabel: string | null): 'neutral' | 'success' | 'warning' {
  if (bandLabel === 'Orta Seviye') return 'success';
  if (bandLabel === 'Üst Bant') return 'warning';
  return 'neutral';
}

function parseNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function positionLabelByPrice(price: number, stats: ListingPriceStats): string {
  const position = displayPosition(price, stats.min, stats.max);
  if (position <= 0.25) return 'Alt Bant';
  if (position <= 0.75) return 'Orta Seviye';
  return 'Üst Bant';
}

function displayPosition(value: number, min: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max) || max <= min) return 0.5;
  return clamp((value - min) / (max - min), 0, 1);
}

function normalizePanelText(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr');
}

async function analyzeListing(input: {
  listingUrl: string;
  myPrice: number;
  netProfit: number;
  targetGap: number;
  suggestedPrice: number;
}): Promise<{ stats: ListingPriceStats; summary: string; pricesCount: number }> {
  const response = await fetch('/api/category-analysis', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(input)
  });

  const data = (await response.json()) as CategoryAnalysisResponse;

  if (!response.ok || !data.ok) {
    throw new Error(data.ok ? 'Listing analizi alınamadı.' : data.message);
  }

  return {
    stats: data.stats,
    summary: data.summary,
    pricesCount: data.pricesCount
  };
}
