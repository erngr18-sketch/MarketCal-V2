'use client';

import Link from 'next/link';
import { X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AiPanel, type AiPanelItem } from '@/app/components/ai-panel';
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
  salesPrice: 120,
  costPrice: 60,
  targetProfit: 15,
  defaultAdvertisingCost: 10
};

const INITIAL_ROWS: CompareCardState[] = ['trendyol', 'hepsiburada'].map((id) => {
  const marketplace = MARKETPLACES.find((item) => item.id === id)!;
  return {
    marketplaceId: marketplace.id,
    commissionRate: marketplace.defaults.commissionRate,
    commissionCapped: false,
    shippingCost: marketplace.defaults.shippingCost,
    advertisingCostOverride: '',
    campaignEnabled: false,
    discountRate: 0,
    couponValue: 0
  };
});

export default function ComparePage() {
  const [globals, setGlobals] = useState<GlobalValues>(INITIAL_GLOBALS);
  const [rows, setRows] = useState<CompareCardState[]>(INITIAL_ROWS);

  const usedMarketplaces = new Set(rows.map((row) => row.marketplaceId));
  const addableMarketplaces = MARKETPLACES.filter((marketplace) => !usedMarketplaces.has(marketplace.id));

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
          commissionRate: clamp(row.commissionRate, 0, 80),
          shippingCost: row.shippingCost,
          advertisingCost: hasOverride ? Math.max(0, parsedOverride) : globals.defaultAdvertisingCost,
          discountRate: row.campaignEnabled ? row.discountRate : 0,
          couponValue: row.campaignEnabled ? row.couponValue : 0
        };
      }),
    [globals, rows]
  );

  const result = useMemo(() => calculateCompare({ rows: engineRows }), [engineRows]);

  const topMarketplaceId = useMemo(() => {
    const ranked = rows.map((row, index) => {
      const rowResult = result.rows[index];
      return {
        marketplaceId: row.marketplaceId,
        netProfit: rowResult?.netProfit ?? Number.NEGATIVE_INFINITY
      };
    });

    ranked.sort((a, b) => {
      if (a.netProfit !== b.netProfit) return b.netProfit - a.netProfit;
      return a.marketplaceId.localeCompare(b.marketplaceId, 'tr');
    });

    return ranked[0]?.marketplaceId ?? '';
  }, [result.rows, rows]);

  const assistantItems = useMemo(
    () => buildAssistantItems({ rows, engineRows, resultRows: result.rows, topMarketplaceId, targetProfit: globals.targetProfit }),
    [engineRows, globals.targetProfit, result.rows, rows, topMarketplaceId]
  );

  const onGlobalChange = (key: keyof GlobalValues, raw: string) => {
    const next = Number(raw);
    setGlobals((prev) => ({
      ...prev,
      [key]: Number.isFinite(next) ? Math.max(0, next) : 0
    }));
  };

  const onMarketplaceChange = (index: number, nextId: MarketplaceId) => {
    setRows((prev) => {
      const alreadyUsed = prev.some((row, rowIndex) => rowIndex !== index && row.marketplaceId === nextId);
      if (alreadyUsed) return prev;
      return prev.map((row, rowIndex) => (rowIndex === index ? { ...row, marketplaceId: nextId } : row));
    });
  };

  const onRowNumberChange = (index: number, key: 'commissionRate' | 'shippingCost' | 'discountRate' | 'couponValue', raw: string) => {
    const numeric = Number(raw);
    const safe = Number.isFinite(numeric) ? numeric : 0;

    setRows((prev) =>
      prev.map((row, rowIndex) => {
        if (rowIndex !== index) return row;

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

  const onAdvertisingOverrideChange = (index: number, raw: string) => {
    setRows((prev) => prev.map((row, rowIndex) => (rowIndex === index ? { ...row, advertisingCostOverride: raw } : row)));
  };

  const onCampaignToggle = (index: number, enabled: boolean) => {
    setRows((prev) =>
      prev.map((row, rowIndex) =>
        rowIndex === index
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

  const addMarketplace = () => {
    if (addableMarketplaces.length === 0) return;
    const next = addableMarketplaces[0];
    setRows((prev) => [
      ...prev,
      {
        marketplaceId: next.id,
        commissionRate: next.defaults.commissionRate,
        commissionCapped: false,
        shippingCost: next.defaults.shippingCost,
        advertisingCostOverride: '',
        campaignEnabled: false,
        discountRate: 0,
        couponValue: 0
      }
    ]);
  };

  const removeMarketplace = (index: number) => {
    setRows((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Karşılaştırma</h1>
          <p className="mt-1 text-sm text-slate-600">Tek ürün senaryosunda pazaryerlerini komisyon, kargo ve kampanya etkileriyle kıyaslayın.</p>
          <p className="mt-1 text-xs text-slate-500">1) Ürün senaryosunu gir  2) Pazaryerlerini ekle  3) Önerileri uygula</p>
        </div>
        <Link className="btn btn-primary" href={`/app/competition?price=${safePriceForCompetition(globals.salesPrice)}`}>
          Rekabet Analizine Geç
        </Link>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <section className="card p-6">
            <div className="card-header">
              <h2 className="card-title">Ürün Senaryosu</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <Field label="Satış Fiyatı (₺)">
                <input type="number" className="input" value={globals.salesPrice} onChange={(e) => onGlobalChange('salesPrice', e.target.value)} />
              </Field>
              <Field label="Ürün Maliyeti (₺)">
                <input type="number" className="input" value={globals.costPrice} onChange={(e) => onGlobalChange('costPrice', e.target.value)} />
              </Field>
              <Field label="Varsayılan Reklam (₺)">
                <input
                  type="number"
                  className="input"
                  value={globals.defaultAdvertisingCost}
                  onChange={(e) => onGlobalChange('defaultAdvertisingCost', e.target.value)}
                />
              </Field>
              <Field label="Hedef Kâr (₺)">
                <input type="number" className="input" value={globals.targetProfit} onChange={(e) => onGlobalChange('targetProfit', e.target.value)} />
              </Field>
            </div>
          </section>

          <section className="card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="card-title">Pazaryerleri</h2>
              <button type="button" className="btn btn-secondary" onClick={addMarketplace} disabled={addableMarketplaces.length === 0}>
                Yeni Pazaryeri Ekle
              </button>
            </div>

            <div className="mt-4 grid items-stretch gap-4 lg:grid-cols-2">
              {rows.map((row, index) => {
                const rowResult = result.rows[index];
                if (!rowResult) return null;

                const rank = resolveProfitRank({
                  marketplaceId: row.marketplaceId,
                  topMarketplaceId,
                  netProfit: rowResult.netProfit,
                  targetProfit: globals.targetProfit
                });

                return (
                  <article key={`${row.marketplaceId}-${index}`} className={`relative flex h-full flex-col rounded-xl border p-3 ${statusCardClass(rank)}`}>
                    <div className="flex min-w-0 items-center justify-between gap-2">
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <select
                          className="h-10 min-w-0 max-w-[170px] flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition focus:ring-2 focus:ring-slate-200"
                          value={row.marketplaceId}
                          onChange={(e) => onMarketplaceChange(index, e.target.value as MarketplaceId)}
                        >
                          {MARKETPLACES.map((marketplace) => {
                            const disabled = usedMarketplaces.has(marketplace.id) && marketplace.id !== row.marketplaceId;
                            return (
                              <option key={marketplace.id} value={marketplace.id} disabled={disabled}>
                                {marketplace.label}
                              </option>
                            );
                          })}
                        </select>
                        <RankBadge rank={rank} />
                      </div>

                      <button
                        type="button"
                        aria-label="Kartı Sil"
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                        onClick={() => removeMarketplace(index)}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-3 grid gap-2 md:grid-cols-3">
                      <Field label="Komisyon (%)">
                        <input
                          type="number"
                          min={0}
                          max={80}
                          step={0.1}
                          className="input"
                          value={row.commissionRate}
                          onChange={(e) => onRowNumberChange(index, 'commissionRate', e.target.value)}
                        />
                        {row.commissionCapped ? <p className="helper-text mt-1 text-amber-700">Komisyon oranı %80’den büyük olamaz.</p> : null}
                      </Field>
                      <Field label="Kargo (₺)">
                        <input type="number" min={0} className="input" value={row.shippingCost} onChange={(e) => onRowNumberChange(index, 'shippingCost', e.target.value)} />
                      </Field>
                      <Field label="Reklam (₺)">
                        <input
                          type="number"
                          min={0}
                          className="input"
                          value={row.advertisingCostOverride}
                          onChange={(e) => onAdvertisingOverrideChange(index, e.target.value)}
                          placeholder={String(globals.defaultAdvertisingCost)}
                        />
                      </Field>
                    </div>

                    <label className="mt-2 inline-flex items-center gap-2 text-xs text-slate-700">
                      <input type="checkbox" className="h-3.5 w-3.5 rounded border-slate-300" checked={row.campaignEnabled} onChange={(e) => onCampaignToggle(index, e.target.checked)} />
                      Kampanya Aktif
                    </label>

                    {row.campaignEnabled ? (
                      <div className="mt-2 grid gap-2 md:grid-cols-2">
                        <Field label="İndirim (%)">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={0.1}
                            className="input disabled:bg-slate-100 disabled:text-slate-400"
                            value={row.discountRate}
                            disabled={row.couponValue > 0}
                            onChange={(e) => onRowNumberChange(index, 'discountRate', e.target.value)}
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
                            onChange={(e) => onRowNumberChange(index, 'couponValue', e.target.value)}
                          />
                        </Field>
                      </div>
                    ) : null}

                    <div className="mt-3 border-t border-slate-200 pt-3" />

                    <div className="grid gap-2 md:grid-cols-2">
                      <ResultItem label="Efektif Fiyat" value={formatCurrency(rowResult.effectivePrice)} />
                      <ResultItem label="Komisyon Tutarı" value={formatCurrency(rowResult.commissionAmount)} />
                      <ResultItem label="Net Kâr" value={formatCurrency(rowResult.netProfit)} />
                      <ResultItem label="Önerilen Satış" value={formatCurrency(rowResult.suggestedSalesPrice)} />
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6">
          <AiPanel items={assistantItems} />

          <section className="card p-5">
            <h3 className="card-title">Özet</h3>
            <div className="mt-3 grid items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <ResultItem label="Toplam Net Kâr" value={formatCurrency(result.summary.totalNetProfit)} />
              <ResultItem label="Ortalama Net Kâr" value={formatCurrency(result.summary.averageNetProfit)} />
              <ResultItem label="En Karlı" value={labelByMarketplaceId(result.summary.topMarketplaceId)} />
              <ResultItem label="En Düşük Net Kâr" value={labelByMarketplaceId(result.summary.worstMarketplaceId)} />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function buildAssistantItems({
  rows,
  engineRows,
  resultRows,
  topMarketplaceId,
  targetProfit
}: {
  rows: CompareCardState[];
  engineRows: CompareRowInput[];
  resultRows: ReturnType<typeof calculateCompare>['rows'];
  topMarketplaceId: string;
  targetProfit: number;
}): AiPanelItem[] {
  const ranked = rows
    .map((row, index) => {
      const output = resultRows[index];
      const input = engineRows[index];
      if (!output || !input) return null;
      const rank = resolveProfitRank({
        marketplaceId: row.marketplaceId,
        topMarketplaceId,
        netProfit: output.netProfit,
        targetProfit
      });
      return {
        marketplaceId: row.marketplaceId,
        label: labelByMarketplaceId(row.marketplaceId),
        rank,
        row,
        input,
        output
      };
    })
    .filter(Boolean) as Array<{
    marketplaceId: string;
    label: string;
    rank: ProfitRank;
    row: CompareCardState;
    input: CompareRowInput;
    output: ReturnType<typeof calculateCompare>['rows'][number];
  }>;

  if (ranked.length === 0) {
    return [
      { icon: 'info', tone: 'neutral', text: 'Analiz için en az bir pazaryeri ekleyin.' },
      { icon: 'spark', tone: 'success', text: 'Temel giderleri girip karşılaştırmayı başlatın.' },
      { icon: 'alert', tone: 'warning', text: 'Sonuçlar tahminidir; panel verileriyle doğrulayın.' }
    ];
  }

  const top = ranked.find((item) => item.rank === 'top') ?? ranked[0];
  const actions = [...ranked]
    .filter((item) => item.marketplaceId !== top.marketplaceId)
    .sort((a, b) => a.output.netProfit - b.output.netProfit)
    .slice(0, 3)
    .map((item): AiPanelItem => ({
      icon: rankIcon(item.rank),
      tone: rankTone(item.rank),
      text: `${item.label} (${rankLabel(item.rank)}) — ${buildRecommendation(item, targetProfit)}`
    }));

  const items: AiPanelItem[] = [
    { icon: 'trendUp', tone: 'success', emphasis: true, text: `${top.label} şu anda en yüksek net kârı üretiyor.` },
    ...actions,
    { icon: 'check', tone: 'neutral', text: 'Komisyon oranını panelden teyit et.' }
  ];
  return items.slice(0, 5);
}

function rankLabel(rank: ProfitRank) {
  if (rank === 'top') return 'En Karlı';
  if (rank === 'profit') return 'Karlılık Var';
  if (rank === 'weak') return 'Zayıf Karlılık';
  return 'Zarar';
}

function rankIcon(rank: ProfitRank): AiPanelItem['icon'] {
  return rank === 'loss' ? 'trendDown' : 'target';
}

function rankTone(rank: ProfitRank): AiPanelItem['tone'] {
  if (rank === 'loss') return 'danger';
  if (rank === 'weak') return 'warning';
  return 'success';
}

function buildRecommendation(
  row: {
    label: string;
    row: CompareCardState;
    input: CompareRowInput;
    output: ReturnType<typeof calculateCompare>['rows'][number];
  },
  targetProfit: number
) {
  if (row.row.campaignEnabled) {
    if (row.row.discountRate > 0) return `${row.label} için indirim oranını kademeli azaltmak kârlılığı artırabilir.`;
    if (row.row.couponValue > 0) return `${row.label} için kupon tutarını kademeli düşürmek marjı iyileştirebilir.`;
  }

  if (row.input.advertisingCost > 0) return `${row.label} tarafında reklam maliyetini optimize etmek net kârı dengeleyebilir.`;
  if (row.input.shippingCost > 0) return `${row.label} tarafında kargo maliyetini optimize etmek kârlılığı iyileştirebilir.`;

  const gap = Math.max(0, targetProfit - row.output.netProfit);
  const commissionFactor = 1 - clamp(row.row.commissionRate, 0, 80) / 100;
  const requiredDelta = commissionFactor > 0 ? Math.ceil(gap / commissionFactor) : Math.ceil(gap);
  const safeDelta = Math.max(5, requiredDelta);
  return `${row.label} tarafında satış fiyatını yaklaşık ${safeDelta} TL artırmak kârlılığı dengeleyebilir.`;
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

function RankBadge({ rank }: { rank: ProfitRank }) {
  if (rank === 'top') {
    return <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">🥇 En Karlı</span>;
  }

  if (rank === 'profit') {
    return <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">🟢 Karlılık Var</span>;
  }

  if (rank === 'weak') {
    return <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">🟠 Zayıf Karlılık</span>;
  }

  return <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">🔴 Zarar</span>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1.5 text-sm text-slate-700">
      <span>{label}</span>
      {children}
    </label>
  );
}

function ResultItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2.5">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="number-display whitespace-nowrap text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function statusCardClass(rank: ProfitRank) {
  if (rank === 'top') return 'border-green-300 bg-green-50/40';
  if (rank === 'profit') return 'border-emerald-200 bg-emerald-50/30';
  if (rank === 'weak') return 'border-amber-200 bg-amber-50/40';
  return 'border-red-200 bg-red-50/40';
}

function labelByMarketplaceId(id: string) {
  return MARKETPLACES.find((marketplace) => marketplace.id === id)?.label ?? '-';
}

function safePriceForCompetition(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 120;
  return Math.max(0, Math.round(value * 100) / 100);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
