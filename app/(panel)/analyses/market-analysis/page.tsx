'use client';

import { Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AiPanel, type AiPanelItem } from '@/app/components/ai-panel';
import {
  formatTry,
  runCompetition,
  validateTrendyolUrl,
  type CompetitionMode,
  type CompetitionOutput
} from '@/lib/profit/competition-engine';

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

type CompetitionAnalysisSnapshot = {
  result: CompetitionOutput;
  profit: ReturnType<typeof calculateProfitMetrics>;
  parsed: ReturnType<typeof parseInputs>;
  manualOpen: boolean;
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
  manualOpen: false,
  manualLow: '',
  manualMid: '',
  manualHigh: ''
};

export default function CompetitionPage() {
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [errors, setErrors] = useState<ValidationState>({});
  const [result, setResult] = useState<CompetitionOutput | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalyzedKey, setLastAnalyzedKey] = useState<string | null>(null);
  const [analysisSnapshot, setAnalysisSnapshot] = useState<CompetitionAnalysisSnapshot | null>(null);

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
  const analysisKey = useMemo(
    () =>
      JSON.stringify({
        url: form.manualOpen ? '' : form.url.trim(),
        mode: form.mode,
        myPrice: parsed.myPrice,
        costPrice: parsed.costPrice,
        commissionRate: parsed.commissionRate,
        shippingCost: parsed.shippingCost,
        advertisingCost: parsed.advertisingCost,
        targetProfit: parsed.targetProfit,
        manualOpen: form.manualOpen,
        manualLow: parsed.manualLow,
        manualMid: parsed.manualMid,
        manualHigh: parsed.manualHigh
      }),
    [
      form.manualOpen,
      form.mode,
      form.url,
      parsed.advertisingCost,
      parsed.commissionRate,
      parsed.costPrice,
      parsed.manualHigh,
      parsed.manualLow,
      parsed.manualMid,
      parsed.myPrice,
      parsed.shippingCost,
      parsed.targetProfit
    ]
  );
  const hasFreshResult = result !== null && lastAnalyzedKey === analysisKey;

  const canRun = useMemo(() => {
    if (!(parsed.myPrice > 0)) return false;
    if (parsed.costPrice < 0) return false;
    if (!parsed.commissionValid) return false;
    if (form.manualOpen) return parsed.manualValid;
    if (!urlValidation.ok) return false;
    return true;
  }, [form.manualOpen, parsed.commissionValid, parsed.costPrice, parsed.manualValid, parsed.myPrice, urlValidation.ok]);

  const scenarioReady = useMemo(() => parsed.myPrice > 0 && parsed.costPrice >= 0 && parsed.commissionValid, [parsed.commissionValid, parsed.costPrice, parsed.myPrice]);
  const linkReady = form.manualOpen ? true : urlValidation.ok;

  const ctaState = useMemo(() => {
    if (isAnalyzing) {
      return { label: 'Analiz Ediliyor...', helper: '', disabled: true };
    }

    if (!form.manualOpen && !linkReady && !scenarioReady) {
      return {
        label: 'Bilgiler tamamlanmayı bekliyor',
        helper: 'Kategori linki ile fiyat, maliyet ve temel giderleri tamamlayın.',
        disabled: true
      };
    }

    if (!form.manualOpen && !linkReady) {
      return {
        label: 'Link tanımı bekleniyor',
        helper: form.url.trim() ? (urlValidation.reason ?? 'Geçerli bir kategori linki girin.') : 'Kategori linki ekleyin.',
        disabled: true
      };
    }

    if (!scenarioReady) {
      return {
        label: 'Senaryo bilgileri bekleniyor',
        helper: 'Fiyat, maliyet ve temel giderleri tamamlayın.',
        disabled: true
      };
    }

    if (form.manualOpen && !parsed.manualValid) {
      return {
        label: 'Senaryo bilgileri bekleniyor',
        helper: 'Manuel fiyatlarda düşük, orta ve yüksek sırasını tamamlayın.',
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
  }, [form.manualOpen, form.url, hasFreshResult, isAnalyzing, linkReady, parsed.manualValid, scenarioReady, urlValidation.reason]);

  const onRunAnalysis = async () => {
    if (isAnalyzing || !canRun) return;

    const nextErrors: ValidationState = {};

    if (!form.manualOpen && (!form.url.trim() || !urlValidation.ok)) {
      nextErrors.url = urlValidation.reason ?? 'Geçerli bir kategori linki girin.';
    }
    if (!(parsed.myPrice > 0)) {
      nextErrors.myPrice = 'Satış fiyatı 0’dan büyük olmalıdır.';
    }
    if (parsed.costPrice < 0) {
      nextErrors.costPrice = 'Maliyet 0’dan küçük olamaz.';
    }
    if (!parsed.commissionValid) {
      nextErrors.commissionRate = 'Komisyon %100 üstü olamaz.';
    }
    if (form.manualOpen && !parsed.manualValid) {
      nextErrors.manual = 'Manuel fiyatlar: düşük < orta < yüksek olmalı.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    try {
      setIsAnalyzing(true);
      const useManual = form.manualOpen && parsed.manualValid;

      const [output] = await Promise.all([
        Promise.resolve(
          runCompetition({
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
          })
        ),
        new Promise((resolve) => setTimeout(resolve, 900))
      ]);

      setResult(output);
      setAnalysisSnapshot({
        result: output,
        profit,
        parsed,
        manualOpen: form.manualOpen
      });
      setLastAnalyzedKey(analysisKey);
      setErrors({});
    } catch (error) {
      setErrors({ submit: error instanceof Error ? error.message : 'Analiz sırasında hata oluştu.' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const aiItems = useMemo(() => {
    if (!analysisSnapshot) {
      return [
        { icon: 'info', tone: 'neutral', text: 'Not: Analiz için fiyat, maliyet ve gider alanlarını tamamlayın.' },
        { icon: 'target', tone: 'neutral', title: 'Durum', reason: 'Kategori fiyat bandındaki yeriniz analizden sonra burada özetlenir.', text: 'Durum' },
        { icon: 'check', tone: 'neutral', title: 'Kârlılık', reason: 'Tahmini net kâr ve hedef farkı senaryonuzla birlikte değerlendirilir.', text: 'Kârlılık' }
      ] satisfies AiPanelItem[];
    }

    const { profit: analyzedProfit, parsed: analyzedParsed, manualOpen: analyzedManualOpen, result: analyzedResult } = analysisSnapshot;
    const profitability = analyzedProfit.netProfit;
    const distance = analyzedProfit.distanceToTarget;

    return [
      {
        icon: 'info',
        tone: 'neutral',
        text: analyzedManualOpen
          ? 'Not: Manuel ortalama fiyatlarla analiz yapılıyor. Kategori linki bu senaryoda kullanılmaz.'
          : 'Not: Kategori linkinden gelen fiyat bandı üzerinden konum ve kârlılık tahmini oluşturulur.'
      },
      {
        icon: distance <= 0 ? 'target' : analyzedProfit.netProfit >= 0 ? 'alert' : 'trendDown',
        tone: distance <= 0 ? 'success' : analyzedProfit.netProfit >= 0 ? 'warning' : 'danger',
        title: 'Durum',
        reason:
          distance <= 0
            ? `Hedef kâr karşılanıyor. Senaryo şu an ${analyzedProfit.statusLabel.toLowerCase()} görünüyor.`
            : analyzedProfit.netProfit >= 0
              ? `Senaryo pozitif ama hedefe ${formatTry(distance)} uzaklık var.`
              : `Mevcut giderlerle senaryo ${formatTry(profitability)} seviyesinde zarar riski taşıyor.`,
        inlineTitle: true,
        text: 'Durum'
      },
      {
        icon: profitability >= 0 ? 'check' : 'trendDown',
        tone: profitability >= 0 ? 'success' : 'danger',
        title: 'Kârlılık',
        reason:
          profitability >= 0
            ? `Tahmini net kâr ${formatTry(profitability)} seviyesinde.`
            : `Tahmini net sonuç ${formatTry(profitability)} seviyesinde.`,
        inlineTitle: true,
        text: 'Kârlılık'
      },
      {
        icon: analyzedResult.segment === 'loss' || analyzedResult.segment === 'borderline' ? 'alert' : 'spark',
        tone: analyzedResult.segment === 'loss' || analyzedResult.segment === 'borderline' ? 'warning' : 'neutral',
        title: 'Risk',
        reason: buildCompetitionRiskText(analyzedResult, analyzedProfit, analyzedParsed.myPrice),
        inlineTitle: true,
        text: 'Risk'
      }
    ] satisfies AiPanelItem[];
  }, [analysisSnapshot]);

  return (
    <div className="space-y-6">
      <section className="space-y-1.5">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold text-slate-900">Rekabet Analizi</h1>
          <p className="text-sm text-slate-600">Kategori veya arama sonucundaki fiyat seviyeni pazardaki konumuna göre değerlendir.</p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <section className="card min-h-[356px] p-6">
          <div className="card-header">
            <h2 className="card-title">Ürün Senaryosu</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
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

          <div className="mt-5 space-y-4 border-t border-slate-200 pt-4">
            <Field label="Kategori Linki">
              <input
                type="url"
                className="input disabled:bg-slate-100 disabled:text-slate-400"
                value={form.url}
                onChange={(event) => setForm((prev) => ({ ...prev, url: event.target.value }))}
                placeholder={EXAMPLE_TRENDYOL_SR_URL}
                disabled={form.manualOpen}
              />
              {form.manualOpen ? <p className="helper-text text-xs text-slate-500">Manuel fiyat girişi açıkken kategori linki kullanılmaz.</p> : null}
              {!form.manualOpen && !form.url.trim() ? <p className="helper-text text-xs text-slate-500">Örnek: {EXAMPLE_TRENDYOL_SR_URL}</p> : null}
              {!form.manualOpen && form.url.trim() && !urlValidation.ok ? <p className="error-text text-xs text-rose-600">{errors.url ?? urlValidation.reason}</p> : null}
              {!form.manualOpen && form.url.trim() && urlValidation.ok ? (
                <p className="success-text text-xs text-emerald-600">{`Geçerli ${urlValidation.sourceLabel ?? ''} kategori linki`.trim()}</p>
              ) : null}
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
              <p className="helper-text text-xs text-slate-500">Seçilen moda göre kategori sonuçlarından fiyat bandı simüle edilir.</p>
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
              <p className="mt-1 text-xs text-slate-500">Bu modda kategori linki yerine ortalama fiyatları siz girersiniz.</p>

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
              disabled={ctaState.disabled}
            >
              <span className="inline-flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                <span>{ctaState.label}</span>
              </span>
            </button>
            {ctaState.helper ? <p className="helper-text text-xs text-slate-500">{ctaState.helper}</p> : null}
            {form.manualOpen && !parsed.manualValid ? <p className="error-text text-xs text-rose-600">Manuel fiyatlar: düşük &lt; orta &lt; yüksek olmalı.</p> : null}
          </div>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <AiPanel
            items={aiItems}
            title="AI Analiz"
            disclaimer="Not: Bu analiz kategori fiyat bandını simüle eder; gerçek sonuçlar kampanya ve görünürlüğe göre değişebilir."
          />

          <section className="card p-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="card-title">Pazar Konumu</h3>
              {analysisSnapshot ? <CompetitionRankBadge segmentLabel={analysisSnapshot.profit.statusLabel} /> : null}
            </div>

            {analysisSnapshot ? (
              <>
                <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Net Kâr</p>
                    <p className="mt-1 text-3xl font-semibold text-slate-900">{formatTry(analysisSnapshot.profit.netProfit)}</p>
                  </div>
                  <div className="text-right" />
                </div>

                <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
                  <MetricRow label="Hedef Kâr" value={formatTry(analysisSnapshot.parsed.targetProfit)} />
                  <MetricRow
                    label={targetGapLabel(analysisSnapshot.profit.distanceToTarget)}
                    value={formatTry(Math.abs(analysisSnapshot.profit.distanceToTarget))}
                    tone={analysisSnapshot.profit.distanceToTarget <= 0 ? 'success' : 'warning'}
                  />
                  <MetricRow label="Satış Fiyatı" value={formatTry(analysisSnapshot.result.myPrice)} />
                </div>

                <div className="mt-5">
                  <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    <BandSegment
                      label="Alt Bant"
                      value={formatTry(analysisSnapshot.result.stats.q1)}
                      active={bandKeyByPrice(analysisSnapshot.result.myPrice, analysisSnapshot.result.stats) === 'low'}
                      tone="low"
                    />
                    <BandSegment
                      label="Orta Bant"
                      value={formatTry(analysisSnapshot.result.stats.median)}
                      active={bandKeyByPrice(analysisSnapshot.result.myPrice, analysisSnapshot.result.stats) === 'mid'}
                      tone="mid"
                    />
                    <BandSegment
                      label="Üst Bant"
                      value={formatTry(analysisSnapshot.result.stats.q3)}
                      active={bandKeyByPrice(analysisSnapshot.result.myPrice, analysisSnapshot.result.stats) === 'high'}
                      tone="high"
                    />
                  </div>
                </div>

                <div className="mt-5 border-t border-slate-200 pt-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-indigo-500" />
                    <p className="text-sm font-semibold text-slate-900">AI Analiz</p>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{buildMarketPositionComment(analysisSnapshot.result)}</p>
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-500">Fiyat konumu analizi başlattığınızda burada gösterilir.</p>
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

function buildMarketPositionComment(result: CompetitionOutput) {
  if (result.segment === 'top') {
    return 'Fiyatın pazarın alt bandına yakın görünüyor. Görünürlük avantajını korurken marjı yakından izle.';
  }
  if (result.segment === 'on_target') {
    return 'Fiyatın orta seviyeye yakın. Bu bant genelde daha dengeli bir başlangıç sunar.';
  }
  if (result.segment === 'borderline') {
    return 'Fiyatın üst banda yaklaşıyor. Ürün değerini net anlatarak dönüşüm tarafını izle.';
  }
  return 'Fiyatın pazarın üst bandında görünüyor. Marj güçlü olsa da dönüşüm riskini küçük testlerle izle.';
}

function buildCompetitionRiskText(result: CompetitionOutput | null, profit: ReturnType<typeof calculateProfitMetrics>, myPrice: number) {
  if (!result) {
    return 'Analizden sonra fiyatın pazardaki bandı ve kısa risk notu burada görünür.';
  }

  if (result.segment === 'loss') {
    return `Fiyat ${formatTry(myPrice)} ile pazarın üst bandında. Dönüşüm tarafını küçük testlerle izlemek faydalı olur.`;
  }

  if (result.segment === 'borderline') {
    return 'Fiyat üst banda yakın. Komisyon ve giderlerde küçük artışlar marjı hızlı daraltabilir.';
  }

  if (profit.distanceToTarget > 0) {
    return 'Pazar konumu dengeli olsa da hedef kâr için gider tarafını sıkı takip etmek gerekir.';
  }

  return 'Pazar konumu ve kârlılık birlikte dengeli görünüyor. Küçük fiyat testleriyle dönüşümü gözlemlemek yeterli olabilir.';
}

function targetGapLabel(distanceToTarget: number) {
  return distanceToTarget <= 0 ? 'Hedefin Üzerinde' : 'Hedefe Kalan';
}

function bandKeyByPrice(price: number, stats: CompetitionOutput['stats']) {
  if (price < stats.q1) return 'low';
  if (price <= stats.q3) return 'mid';
  return 'high';
}

function bandNameByPrice(price: number, stats: CompetitionOutput['stats']) {
  const key = bandKeyByPrice(price, stats);
  if (key === 'low') return 'Alt Bant';
  if (key === 'mid') return 'Orta Bant';
  return 'Üst Bant';
}

function parseInputs(form: FormState) {
  const myPrice = parseNumber(form.myPrice);
  const costPrice = parseNumber(form.costPrice);
  const commissionRate = parseNumber(form.commissionRate);
  const shippingCost = parseNumber(form.shippingCost);
  const advertisingCost = parseNumber(form.advertisingCost);
  const targetProfit = parseNumber(form.targetProfit);

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
    manualLow,
    manualMid,
    manualHigh,
    manualValid
  };
}

function calculateProfitMetrics(parsed: ReturnType<typeof parseInputs>) {
  const effectivePrice = parsed.myPrice;
  const commissionRate = clamp(parsed.commissionRate / 100, 0, 0.9999);
  const commissionAmount = effectivePrice * commissionRate;
  const netProfit = effectivePrice - parsed.costPrice - commissionAmount - parsed.shippingCost - parsed.advertisingCost;
  const distanceToTarget = parsed.targetProfit - netProfit;

  const statusLabel = netProfit < 0 ? 'Zararda' : distanceToTarget >= 0 ? 'Hedefte' : 'Sınırda';

  return {
    netProfit,
    distanceToTarget,
    statusLabel
  };
}

function parseNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
