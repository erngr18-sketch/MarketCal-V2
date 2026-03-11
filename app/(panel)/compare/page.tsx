'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { AiPanelItem } from '@/app/components/ai-panel';
import { InfoNote, MetricCard } from '@/app/components/ui/clarity';
import { Iridescence } from '@/app/components/ui/iridescence';
import { calculateCompare, formatCurrency, type CompareRowInput } from '@/lib/profit/compare-engine';

const MARKETPLACES = [
  { id: 'trendyol', label: 'Trendyol', defaults: { commissionRate: 20, shippingCost: 10 } },
  { id: 'hepsiburada', label: 'Hepsiburada', defaults: { commissionRate: 18, shippingCost: 10 } },
  { id: 'amazon', label: 'Amazon', defaults: { commissionRate: 15, shippingCost: 12 } },
  { id: 'n11', label: 'N11', defaults: { commissionRate: 14, shippingCost: 10 } }
] as const;

type MarketplaceId = (typeof MARKETPLACES)[number]['id'];
type ProfitRank = 'top' | 'profit' | 'weak' | 'loss';

type GlobalValues = {
  salesPrice: number;
  costPrice: number;
  targetProfit: number;
  defaultAdvertisingCost: number;
  vatRate: number;
};

type CompareCardState = {
  marketplaceId: MarketplaceId;
  commissionRate: number;
  commissionCapped: boolean;
  shippingCost: number;
  advertisingCostOverride: string;
  campaignEnabled: boolean;
  discountRate: number;
  couponValue: number;
};

const INITIAL_GLOBALS: GlobalValues = {
  salesPrice: 0,
  costPrice: 0,
  targetProfit: 0,
  defaultAdvertisingCost: 10,
  vatRate: 20
};

const VAT_PRESETS = [20, 10, 1] as const;

export default function ComparePage() {
  const [globals, setGlobals] = useState<GlobalValues>(INITIAL_GLOBALS);
  const [rows, setRows] = useState<CompareCardState[]>([]);
  const [hasResult, setHasResult] = useState(false);
  const [isEditingScenario, setIsEditingScenario] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const customVatInputRef = useRef<HTMLInputElement | null>(null);
  const isCustomVat = !VAT_PRESETS.includes(globals.vatRate as (typeof VAT_PRESETS)[number]);

  const selectedMarketplaceIds = rows.map((row) => row.marketplaceId);
  const hasReachedMarketplaceLimit = rows.length >= 3;
  const hasMarketplaceSelection = rows.length > 0;
  const hasScenarioInputs = globals.salesPrice > 0 && globals.costPrice > 0 && globals.targetProfit > 0;
  const canStartAnalysis = hasMarketplaceSelection && hasScenarioInputs;

  const engineRows: CompareRowInput[] = useMemo(
    () =>
      rows.map((row) => {
        const parsedOverride = Number(row.advertisingCostOverride);
        const hasOverride = row.advertisingCostOverride.trim() !== '' && Number.isFinite(parsedOverride);
        return {
          marketplaceId: row.marketplaceId,
          salesPrice: globals.salesPrice,
          costPrice: globals.costPrice,
          targetProfit: globals.targetProfit,
          vatRate: globals.vatRate,
          commissionRate: clamp(row.commissionRate, 0, 80),
          shippingCost: Math.max(0, row.shippingCost),
          advertisingCost: hasOverride ? Math.max(0, parsedOverride) : globals.defaultAdvertisingCost,
          discountRate: row.campaignEnabled ? row.discountRate : 0,
          couponValue: row.campaignEnabled ? row.couponValue : 0
        };
      }),
    [globals, rows]
  );

  const result = useMemo(() => calculateCompare({ rows: engineRows }), [engineRows]);

  const rankedRows = useMemo(
    () =>
      rows
        .map((row, index) => {
          const output = result.rows[index];
          if (!output) return null;
          return {
            row,
            output
          };
        })
        .filter(Boolean) as Array<{
        row: CompareCardState;
        output: ReturnType<typeof calculateCompare>['rows'][number];
      }>,
    [result.rows, rows]
  );

  const topMarketplaceId = useMemo(() => {
    const sorted = [...rankedRows].sort((a, b) => {
      if (a.output.netProfit !== b.output.netProfit) return b.output.netProfit - a.output.netProfit;
      return a.row.marketplaceId.localeCompare(b.row.marketplaceId, 'tr');
    });
    return sorted[0]?.row.marketplaceId ?? '';
  }, [rankedRows]);

  const aiSummaryItems = useMemo(
    () =>
      buildAiSummaryItems({
        rows: rankedRows,
        topMarketplaceId,
        targetProfit: globals.targetProfit
      }),
    [globals.targetProfit, rankedRows, topMarketplaceId]
  );

  useEffect(() => {
    if (!isCustomVat) return;
    customVatInputRef.current?.focus();
    customVatInputRef.current?.select();
  }, [isCustomVat]);

  const onGlobalChange = (key: keyof GlobalValues, raw: string) => {
    const next = Number(raw);
    setGlobals((prev) => ({
      ...prev,
      [key]: Number.isFinite(next) ? Math.max(0, next) : 0
    }));
  };

  const onVatPresetSelect = (nextVatRate: number | 'custom') => {
    setGlobals((prev) => ({
      ...prev,
      vatRate: nextVatRate === 'custom' ? (isCustomVat ? prev.vatRate : 0) : nextVatRate
    }));
  };

  const toggleMarketplace = (marketplaceId: MarketplaceId) => {
    setRows((prev) => {
      const exists = prev.some((row) => row.marketplaceId === marketplaceId);
      if (exists) {
        const nextRows = prev.filter((row) => row.marketplaceId !== marketplaceId);
        setExpandedCards((current) => {
          const next = { ...current };
          delete next[marketplaceId];
          return next;
        });
        return nextRows;
      }

      if (prev.length >= 3) return prev;
      return [...prev, createMarketplaceRow(marketplaceId)];
    });
  };

  const onRowNumberChange = (marketplaceId: MarketplaceId, key: 'commissionRate' | 'shippingCost' | 'discountRate' | 'couponValue', raw: string) => {
    const numeric = Number(raw);
    const safe = Number.isFinite(numeric) ? numeric : 0;

    setRows((prev) =>
      prev.map((row) => {
        if (row.marketplaceId !== marketplaceId) return row;

        const rawCommission = key === 'commissionRate' ? safe : row.commissionRate;
        const nextRow: CompareCardState = { ...row, [key]: safe };
        nextRow.commissionRate = clamp(nextRow.commissionRate, 0, 80);
        nextRow.commissionCapped = key === 'commissionRate' ? rawCommission > 80 : row.commissionCapped;
        nextRow.shippingCost = Math.max(0, nextRow.shippingCost);
        nextRow.discountRate = clamp(nextRow.discountRate, 0, 100);
        nextRow.couponValue = Math.max(0, nextRow.couponValue);

        if (key === 'discountRate' && nextRow.discountRate > 0) nextRow.couponValue = 0;
        if (key === 'couponValue' && nextRow.couponValue > 0) nextRow.discountRate = 0;

        return nextRow;
      })
    );
  };

  const onAdvertisingOverrideChange = (marketplaceId: MarketplaceId, raw: string) => {
    setRows((prev) => prev.map((row) => (row.marketplaceId === marketplaceId ? { ...row, advertisingCostOverride: raw } : row)));
  };

  const onCampaignToggle = (marketplaceId: MarketplaceId, enabled: boolean) => {
    setRows((prev) =>
      prev.map((row) =>
        row.marketplaceId === marketplaceId
          ? {
              ...row,
              campaignEnabled: enabled,
              discountRate: enabled ? row.discountRate : 0,
              couponValue: enabled ? row.couponValue : 0
            }
          : row
      )
    );
  };

  const startAnalysis = () => {
    if (!canStartAnalysis || isAnalyzing) return;
    setIsAnalyzing(true);
    window.setTimeout(() => {
      setHasResult(true);
      setIsEditingScenario(false);
      setIsAnalyzing(false);
    }, 900);
  };

  const resultMode = hasResult && !isEditingScenario && !isAnalyzing;
  const ctaState = resolveCompareCtaState({
    hasMarketplaceSelection,
    hasScenarioInputs,
    isAnalyzing
  });

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <p className="text-xs font-medium tracking-[0.08em] text-slate-500">Rekabet Analizi / Karşılaştırma</p>
        <h1 className="text-2xl font-semibold text-slate-900">Karşılaştırma</h1>
        <p className="text-sm text-slate-600">Pazaryerleri arasında kârlılığı karşılaştırmak için senaryonu oluştur.</p>
      </section>

      {!hasResult || isEditingScenario ? (
        <section className="card p-5">
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Pazaryeri seçimi</h2>
              <p className="mt-1 text-sm text-slate-600">Bir veya daha fazla pazaryeri seçebilirsin. En fazla 3 seçim.</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {MARKETPLACES.map((marketplace) => {
                const selected = selectedMarketplaceIds.includes(marketplace.id);
                const disabled = !selected && hasReachedMarketplaceLimit;
                return (
                  <button
                    key={marketplace.id}
                    type="button"
                    onClick={() => toggleMarketplace(marketplace.id)}
                    disabled={disabled}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                      selected
                        ? 'border-[#1d3366] bg-[#1d3366] text-white focus-visible:ring-2 focus-visible:ring-[#1d3366]/20'
                        : disabled
                          ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-[#1d3366]/35 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-[#1d3366]/15'
                    }`}
                  >
                    {marketplace.label}
                  </button>
                );
              })}
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Satış Fiyatı (₺)">
                <input type="number" className="input" value={globals.salesPrice} onChange={(e) => onGlobalChange('salesPrice', e.target.value)} />
              </Field>
              <Field label="Ürün Maliyeti (₺)">
                <input type="number" className="input" value={globals.costPrice} onChange={(e) => onGlobalChange('costPrice', e.target.value)} />
              </Field>
              <Field label="Varsayılan Reklam (₺)">
                <input type="number" className="input" value={globals.defaultAdvertisingCost} onChange={(e) => onGlobalChange('defaultAdvertisingCost', e.target.value)} />
              </Field>
              <Field label="Hedef Kâr (₺)">
                <input type="number" className="input" value={globals.targetProfit} onChange={(e) => onGlobalChange('targetProfit', e.target.value)} />
              </Field>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5">
              <p className="text-sm font-medium text-slate-700">KDV Oranı (%)</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {VAT_PRESETS.map((rate) => {
                  const active = globals.vatRate === rate;
                  return (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => onVatPresetSelect(rate)}
                      className={active ? 'badge bg-[#1d3366] text-white focus-visible:ring-2 focus-visible:ring-[#1d3366]/20' : 'badge bg-white text-slate-700 focus-visible:ring-2 focus-visible:ring-[#1d3366]/15'}
                    >
                      %{rate}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => onVatPresetSelect('custom')}
                  className={isCustomVat ? 'badge bg-[#1d3366] text-white focus-visible:ring-2 focus-visible:ring-[#1d3366]/20' : 'badge bg-white text-slate-700 focus-visible:ring-2 focus-visible:ring-[#1d3366]/15'}
                >
                  Diğer
                </button>
                <div className="w-[84px]">
                  {isCustomVat ? (
                    <label className="block text-sm text-slate-700">
                      <span className="sr-only">Özel KDV oranı</span>
                      <input
                        ref={customVatInputRef}
                        type="number"
                        min={0}
                        step={0.1}
                        className="input h-9 w-[84px] rounded-full px-3 text-center"
                        value={globals.vatRate}
                        onChange={(e) => onGlobalChange('vatRate', e.target.value)}
                      />
                    </label>
                  ) : (
                    <div className="h-9 w-[84px]" aria-hidden="true" />
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-center pt-3">
              <div className="w-full max-w-[420px] space-y-2">
                <button
                  type="button"
                  className={`btn h-11 w-full justify-center rounded-xl px-6 text-[15px] font-medium tracking-[0.02em] transition disabled:cursor-not-allowed ${
                    ctaState.enabled
                      ? 'bg-[#1d3366] text-white hover:bg-[#244181] active:translate-y-px'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                  onClick={startAnalysis}
                  disabled={!ctaState.enabled}
                >
                  <span>{ctaState.label}</span>
                </button>
                {ctaState.helper ? <p className="text-center text-xs text-slate-500">{ctaState.helper}</p> : null}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {hasResult ? (
        <>
          {!isEditingScenario ? (
            <section className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Senaryo Özeti</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{rows.map((row) => labelByMarketplaceId(row.marketplaceId)).join(' • ')}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Satış {formatCurrency(globals.salesPrice)} • Maliyet {formatCurrency(globals.costPrice)} • Hedef Kâr {formatCurrency(globals.targetProfit)} • Reklam {formatCurrency(globals.defaultAdvertisingCost)} • KDV %{globals.vatRate}
                  </p>
                </div>
                <button type="button" className="btn h-10 rounded-xl border border-[#1d3366]/20 bg-[#1d3366] px-4 text-sm font-medium text-white hover:bg-[#244181]" onClick={() => setIsEditingScenario(true)}>
                  Senaryoyu Düzenle
                </button>
              </div>
            </section>
          ) : null}

          {resultMode ? (
            <section className="relative overflow-hidden rounded-[28px] border border-[#dce5f8] shadow-sm">
              <div className="absolute inset-0">
                <Iridescence className="opacity-80" color={[0.16, 0.28, 0.56]} speed={0.38} amplitude={0.06} />
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.76),rgba(248,250,252,0.48),rgba(255,255,255,0.64))]" />
              </div>

              <div className="relative space-y-4 p-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#27447f]">AI Karşılaştırma Özeti</p>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-800">Kesin hesaplanan karşılaştırma verileri kartların içinde gösterilir. Bu alan kısa yönlendirme verir.</p>
                </div>

                <ul className="space-y-3">
                  {aiSummaryItems.map((item, index) => (
                    <li key={`${item.text}-${index}`} className="flex items-start gap-3 rounded-2xl bg-white/28 px-3 py-3 backdrop-blur-[1px]">
                      <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${summaryDotClass(item.tone)}`} />
                      <span className={`text-sm leading-6 ${item.emphasis ? 'font-semibold text-slate-950' : 'text-slate-900'}`}>{item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ) : null}

          {resultMode ? <section className="space-y-4">
            {rankedRows.map(({ row, output }) => {
              const rank = resolveProfitRank({
                marketplaceId: row.marketplaceId,
                topMarketplaceId,
                netProfit: output.netProfit,
                targetProfit: globals.targetProfit
              });
              const expanded = expandedCards[row.marketplaceId] ?? false;

              return (
                <article key={row.marketplaceId} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-900">{labelByMarketplaceId(row.marketplaceId)}</h3>
                        <RankBadge rank={rank} />
                      </div>
                      <p className="text-sm text-slate-600">{marketplaceDecisionText(rank, output.netProfit, globals.targetProfit)}</p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Net kâr</p>
                      <p className="number-display mt-1 text-3xl font-semibold text-slate-900">{formatCurrency(output.netProfit)}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <MetricCard label="Net satış" value={formatCurrency(output.netSales)} />
                    <MetricCard label="Önerilen minimum satış" value={formatCurrency(output.suggestedSalesPrice)} />
                    <MetricCard label="Kısa öneri" value={buildRecommendation({ row, output }, globals.targetProfit)} tone={rank === 'loss' ? 'danger' : rank === 'weak' ? 'warning' : 'neutral'} />
                  </div>

                  <div className="mt-4 border-t border-slate-200 pt-4">
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 text-sm font-medium text-slate-700"
                      onClick={() => setExpandedCards((prev) => ({ ...prev, [row.marketplaceId]: !expanded }))}
                    >
                      {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      Detayları Düzenle
                    </button>

                    {expanded ? (
                      <div className="mt-4 grid gap-4 rounded-2xl bg-slate-50 p-4 md:grid-cols-3">
                        <Field label="Komisyon (%)">
                          <input
                            type="number"
                            min={0}
                            max={80}
                            step={0.1}
                            className="input"
                            value={row.commissionRate}
                            onChange={(e) => onRowNumberChange(row.marketplaceId, 'commissionRate', e.target.value)}
                          />
                          {row.commissionCapped ? <p className="mt-1 text-xs text-amber-700">Komisyon oranı %80’i geçemez.</p> : null}
                        </Field>
                        <Field label="Kargo (₺)">
                          <input type="number" min={0} className="input" value={row.shippingCost} onChange={(e) => onRowNumberChange(row.marketplaceId, 'shippingCost', e.target.value)} />
                        </Field>
                        <Field label="Reklam (₺)">
                          <input
                            type="number"
                            min={0}
                            className="input"
                            value={row.advertisingCostOverride}
                            onChange={(e) => onAdvertisingOverrideChange(row.marketplaceId, e.target.value)}
                            placeholder={String(globals.defaultAdvertisingCost)}
                          />
                        </Field>

                        <label className="md:col-span-3 inline-flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300"
                            checked={row.campaignEnabled}
                            onChange={(e) => onCampaignToggle(row.marketplaceId, e.target.checked)}
                          />
                          Kampanya aktif
                        </label>

                        {row.campaignEnabled ? (
                          <>
                            <Field label="İndirim (%)">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                step={0.1}
                                className="input disabled:bg-slate-100 disabled:text-slate-400"
                                value={row.discountRate}
                                disabled={row.couponValue > 0}
                                onChange={(e) => onRowNumberChange(row.marketplaceId, 'discountRate', e.target.value)}
                              />
                            </Field>
                            <Field label="Kupon (₺)">
                              <input
                                type="number"
                                min={0}
                                step={1}
                                className="input disabled:bg-slate-100 disabled:text-slate-400"
                                value={row.couponValue}
                                disabled={row.discountRate > 0}
                                onChange={(e) => onRowNumberChange(row.marketplaceId, 'couponValue', e.target.value)}
                              />
                            </Field>
                          </>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </section> : null}

          {resultMode ? (
            <InfoNote
              label="Kontrol notu"
              text="Satış fiyatı KDV dahil kabul edilir. Net satış ve net kâr hesapları KDV hariç baz alınır."
              tone="warning"
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function createMarketplaceRow(marketplaceId: MarketplaceId): CompareCardState {
  const marketplace = MARKETPLACES.find((item) => item.id === marketplaceId)!;
  return {
    marketplaceId,
    commissionRate: marketplace.defaults.commissionRate,
    commissionCapped: false,
    shippingCost: marketplace.defaults.shippingCost,
    advertisingCostOverride: '',
    campaignEnabled: false,
    discountRate: 0,
    couponValue: 0
  };
}

function buildAiSummaryItems({
  rows,
  topMarketplaceId,
  targetProfit
}: {
  rows: Array<{
    row: CompareCardState;
    output: ReturnType<typeof calculateCompare>['rows'][number];
  }>;
  topMarketplaceId: string;
  targetProfit: number;
}): AiPanelItem[] {
  if (rows.length === 0) {
    return [{ icon: 'info', tone: 'neutral', text: 'Karşılaştırma özeti için önce pazaryeri seç.' }];
  }

  const top = rows.find((item) => item.row.marketplaceId === topMarketplaceId) ?? rows[0];
  const risk = [...rows].sort((a, b) => a.output.netProfit - b.output.netProfit)[0];
  const weakOrLoss = [...rows]
    .sort((a, b) => a.output.netProfit - b.output.netProfit)
    .find((item) => item.output.netProfit < targetProfit);

  return [
    {
      icon: 'trendUp',
      tone: 'success',
      emphasis: true,
      text: `En kârlı kanal şu an ${labelByMarketplaceId(top.row.marketplaceId)} görünüyor.`
    },
    {
      icon: risk.output.netProfit <= 0 ? 'trendDown' : 'alert',
      tone: risk.output.netProfit <= 0 ? 'danger' : 'warning',
      text: `En riskli kanal ${labelByMarketplaceId(risk.row.marketplaceId)}; net kâr ${formatCurrency(risk.output.netProfit)}.`
    },
    {
      icon: 'target',
      tone: weakOrLoss ? 'warning' : 'success',
      text: weakOrLoss
        ? `${labelByMarketplaceId(weakOrLoss.row.marketplaceId)} kartında fiyat veya gider ayarı önce ele alınmalı.`
        : 'Seçilen tüm kanallar hedef kâra yakın ya da üstünde görünüyor.'
    }
  ];
}

function buildRecommendation(
  input: {
    row: CompareCardState;
    output: ReturnType<typeof calculateCompare>['rows'][number];
  },
  targetProfit: number
) {
  if (input.row.campaignEnabled) {
    if (input.row.discountRate > 0) return 'İndirimi azaltmak marjı toparlayabilir.';
    if (input.row.couponValue > 0) return 'Kupon tutarını düşürmek kârı iyileştirebilir.';
  }

  if (input.output.netProfit <= 0) return 'Önce fiyatı veya toplam gideri yeniden dengele.';
  if (input.output.netProfit < targetProfit) return 'Hedefe yaklaşmak için fiyatı ya da reklamı gözden geçir.';
  return 'Mevcut yapı korunabilir; küçük optimizasyonlar yeterli.';
}

function resolveProfitRank({
  marketplaceId,
  topMarketplaceId,
  netProfit,
  targetProfit
}: {
  marketplaceId: string;
  topMarketplaceId: string;
  netProfit: number;
  targetProfit: number;
}): ProfitRank {
  if (marketplaceId === topMarketplaceId) return 'top';
  if (netProfit <= 0) return 'loss';
  if (netProfit >= targetProfit) return 'profit';
  return 'weak';
}

function marketplaceDecisionText(rank: ProfitRank, netProfit: number, targetProfit: number) {
  if (rank === 'top') return 'Bu kanal şu anda en yüksek net kârı veriyor.';
  if (rank === 'profit') return 'Bu kanal hedef kârı karşılıyor.';
  if (rank === 'weak') return `Bu kanal kârda ama hedefin ${formatCurrency(targetProfit - netProfit)} altında.`;
  return 'Bu kanal mevcut senaryoda zarar yazıyor.';
}

function RankBadge({ rank }: { rank: ProfitRank }) {
  if (rank === 'top') return <span className="badge bg-emerald-100 text-emerald-700">En Karlı</span>;
  if (rank === 'profit') return <span className="badge bg-sky-100 text-sky-700">Hedefe Yakın</span>;
  if (rank === 'weak') return <span className="badge bg-amber-100 text-amber-700">Zayıf Karlılık</span>;
  return <span className="badge bg-rose-100 text-rose-700">Zarar</span>;
}

function summaryDotClass(tone: 'neutral' | 'success' | 'warning' | 'danger' | undefined) {
  if (tone === 'success') return 'bg-emerald-500';
  if (tone === 'warning') return 'bg-amber-500';
  if (tone === 'danger') return 'bg-rose-500';
  return 'bg-[#1d3366]';
}

function resolveCompareCtaState({
  hasMarketplaceSelection,
  hasScenarioInputs,
  isAnalyzing
}: {
  hasMarketplaceSelection: boolean;
  hasScenarioInputs: boolean;
  isAnalyzing: boolean;
}) {
  if (isAnalyzing) {
    return {
      label: 'Analiz Ediliyor...',
      helper: '',
      enabled: false
    };
  }

  if (!hasMarketplaceSelection) {
    return {
      label: 'Pazaryeri seçimi bekleniyor',
      helper: 'Karşılaştırma için en az 1 pazaryeri seç.',
      enabled: false
    };
  }

  if (!hasScenarioInputs) {
    return {
      label: 'Senaryo bilgileri eksik',
      helper: 'Satış fiyatı, maliyet ve hedef kâr alanlarını kontrol et.',
      enabled: false
    };
  }

  return {
    label: 'Analizi Başlat',
    helper: '',
    enabled: true
  };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1.5 text-sm text-slate-700">
      <span>{label}</span>
      {children}
    </label>
  );
}

function labelByMarketplaceId(id: string) {
  return MARKETPLACES.find((marketplace) => marketplace.id === id)?.label ?? '-';
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
