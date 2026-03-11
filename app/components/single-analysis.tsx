'use client';

import { useMemo, useState } from 'react';
import { AiPanel, type AiPanelItem } from '@/app/components/ai-panel';
import { DecisionHero, InfoNote, MetricCard } from '@/app/components/ui/clarity';
import { calculateVatAwarePricing, resolveCampaignValues } from '@/lib/profit/pricing-engine';

type SingleInput = {
  salesPrice: number;
  costPrice: number;
  commissionRate: number;
  shippingCost: number;
  advertisingCost: number;
  targetProfit: number;
  vatRate: number;
  campaignEnabled: boolean;
  discountRate: number;
  couponValue: number;
};

type Status = 'loss' | 'weak' | 'ok';

const initialValues: SingleInput = {
  salesPrice: 120,
  costPrice: 60,
  commissionRate: 20,
  shippingCost: 10,
  advertisingCost: 10,
  targetProfit: 15,
  vatRate: 20,
  campaignEnabled: false,
  discountRate: 0,
  couponValue: 0
};

const VAT_PRESETS = [20, 10, 1] as const;

export function SingleAnalysis() {
  const [values, setValues] = useState<SingleInput>(initialValues);
  const isCustomVat = !VAT_PRESETS.includes(values.vatRate as (typeof VAT_PRESETS)[number]);

  const result = useMemo(() => calculate(values), [values]);
  const assistantMessage = useMemo(
    () => buildAssistant(result.status, values.campaignEnabled),
    [result.status, values.campaignEnabled]
  );
  const assistantItems = useMemo(() => toSingleAiPanelItems(assistantMessage, result.status), [assistantMessage, result.status]);
  const decisionTitle = buildSingleDecisionTitle(result.status, values.campaignEnabled);
  const decisionDetail = buildSingleDecisionDetail({
    netProfit: result.netProfit,
    targetGap: result.targetGap,
    campaignEnabled: values.campaignEnabled,
    vatRate: values.vatRate
  });

  const onNumberChange = (key: keyof Omit<SingleInput, 'campaignEnabled'>, raw: string) => {
    const numeric = Number(raw);
    const safe = Number.isFinite(numeric) ? numeric : 0;

    setValues((prev) => {
      const next: SingleInput = { ...prev, [key]: safe };

      next.commissionRate = clamp(next.commissionRate, 0, 80);
      next.discountRate = clamp(next.discountRate, 0, 100);
      next.vatRate = Math.max(0, next.vatRate);
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

  const resetScenario = () => setValues(initialValues);

  const onVatPresetSelect = (nextVatRate: number | 'custom') => {
    setValues((prev) => ({
      ...prev,
      vatRate: nextVatRate === 'custom' ? (isCustomVat ? prev.vatRate : 0) : nextVatRate
    }));
  };

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <p className="text-xs font-medium tracking-[0.08em] text-slate-500">Kâr Analizi / Tek Ürün</p>
        <h1 className="text-2xl font-semibold text-slate-900">Tek Ürün Analizi</h1>
        <p className="text-sm text-slate-600">Ürün senaryosunda net kârı ve hedef kâr durumunu hızlıca gör.</p>
      </section>

      <DecisionHero
        eyebrow="Ana karar"
        title={decisionTitle}
        detail={decisionDetail}
        badge={<span className={statusBadgeClass(result.status)}>{statusLabel(result.status)}</span>}
        metrics={[
          { label: 'Net kâr', value: formatTry(result.netProfit), tone: toneBySingleStatus(result.status) },
          { label: 'Hedef kâr farkı', value: formatTry(result.targetGap), tone: result.targetGap >= 0 ? 'success' : 'warning' },
          { label: 'Net satış', value: formatTry(result.netSales) },
          { label: 'Önerilen fiyat', value: formatTry(result.suggestedSalesPrice), tone: 'accent' }
        ]}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-stretch">
        <section className="card p-6">
          <div className="card-header">
            <h2 className="card-title">Ürün Senaryosu</h2>
            <p className="card-subtitle">Temel maliyetleri ve kampanya etkisini gir.</p>
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
              max={80}
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
            <input
              type="number"
              className="input"
              value={values.advertisingCost}
              onChange={(e) => onNumberChange('advertisingCost', e.target.value)}
            />
          </Field>
          <Field label="Hedef Kâr (₺)">
            <input
              type="number"
              className="input"
              value={values.targetProfit}
              onChange={(e) => onNumberChange('targetProfit', e.target.value)}
            />
          </Field>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
          <div className="min-w-fit">
            <p className="text-sm text-slate-700">KDV Oranı (%)</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {VAT_PRESETS.map((rate) => {
              const active = values.vatRate === rate;
              return (
                <button
                  key={rate}
                  type="button"
                  onClick={() => onVatPresetSelect(rate)}
                  className={active ? 'badge bg-[#1d3366] text-white' : 'badge bg-white text-slate-700'}
                >
                  %{rate}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => onVatPresetSelect('custom')}
              className={isCustomVat ? 'badge bg-[#1d3366] text-white' : 'badge bg-white text-slate-700'}
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
                value={values.vatRate}
                onChange={(e) => onNumberChange('vatRate', e.target.value)}
              />
            </label>
          ) : null}
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
          <section className="card p-6">
            <h3 className="card-title">Kâr özeti</h3>
            <div className="mt-4 grid gap-2">
              <MetricCard label="Net kâr" value={formatTry(result.netProfit)} tone={toneBySingleStatus(result.status)} emphasis />
              <MetricCard label="Hedef kâr farkı" value={formatTry(result.targetGap)} tone={result.targetGap >= 0 ? 'success' : 'warning'} />
              <MetricCard label="Net satış" value={formatTry(result.netSales)} />
              <MetricCard label="Komisyon" value={formatTry(result.commission)} />
            </div>
          </section>

          <section className="card p-6">
            <h3 className="card-title">Hesap ilişkisi</h3>
            <div className="mt-4 grid gap-2">
              <MetricCard
                label="Kampanya etkisi"
                value={values.campaignEnabled ? 'Aktif' : 'Kapalı'}
                hint={values.campaignEnabled ? 'İndirim veya kupon efektif fiyatı aşağı çeker.' : 'Efektif fiyat satış fiyatına eşittir.'}
                tone={values.campaignEnabled ? 'warning' : 'neutral'}
              />
              <MetricCard label="KDV oranı" value={`%${values.vatRate}`} hint="Net satış KDV hariç hesaplanır." />
              <MetricCard label="Hedef kâr" value={formatTry(values.targetProfit)} hint={result.targetGap >= 0 ? 'Mevcut senaryo hedefi karşılıyor.' : 'Mevcut senaryo hedefin altında kalıyor.'} />
            </div>
          </section>

          <AiPanel
            title="Yorum ve öneriler"
            disclaimer="Bu bölüm yorumdur. Kesin hesaplanan değerler üstteki kartlarda gösterilir."
            items={assistantItems}
          />

          <InfoNote
            label="Kontrol notu"
            text="Satış fiyatı KDV dahil kabul edilir. Net satış ve net kâr hesapları KDV hariç baz alınır."
            tone="warning"
          />
        </aside>
      </div>
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
  const campaign = input.campaignEnabled ? resolveCampaignValues(input.discountRate, input.couponValue) : { discountRate: 0, couponValue: 0 };
  const pricing = calculateVatAwarePricing({
    salesPrice: input.salesPrice,
    costPrice: input.costPrice,
    commissionRate: input.commissionRate,
    shippingCost: input.shippingCost,
    advertisingCost: input.advertisingCost,
    targetProfit: input.targetProfit,
    vatRate: input.vatRate,
    discountRate: campaign.discountRate,
    couponValue: campaign.couponValue
  });

  const status: Status = pricing.netProfit < 0 ? 'loss' : pricing.netProfit >= Math.max(0, input.targetProfit) ? 'ok' : 'weak';

  return {
    effectivePrice: pricing.effectivePrice,
    netSales: pricing.netSales,
    commission: pricing.commissionAmount,
    netProfit: pricing.netProfit,
    targetGap: pricing.targetGap,
    marginPct: pricing.marginPct,
    suggestedSalesPrice: pricing.suggestedSalesPrice,
    status
  };
}

function buildSingleDecisionTitle(status: Status, campaignEnabled: boolean) {
  if (status === 'ok') return campaignEnabled ? 'Kampanya açık olsa da bu senaryo hedef kârı karşılıyor.' : 'Bu senaryo hedef kârı karşılıyor.';
  if (status === 'weak') return 'Bu senaryo kârda ama hedefin altında kalıyor.';
  return 'Bu senaryo mevcut giderlerle zarar üretiyor.';
}

function buildSingleDecisionDetail({
  netProfit,
  targetGap,
  campaignEnabled,
  vatRate
}: {
  netProfit: number;
  targetGap: number;
  campaignEnabled: boolean;
  vatRate: number;
}) {
  const campaignText = campaignEnabled ? 'Kampanya efektif fiyatı aşağı çekiyor.' : 'Kampanya etkisi yok.';
  const targetText = targetGap >= 0 ? 'Hedef kâr karşılanıyor.' : `Hedefe kalan fark ${formatTry(Math.abs(targetGap))}.`;
  return `${campaignText} KDV oranı %${vatRate}. Net kâr ${formatTry(netProfit)}. ${targetText}`;
}

function buildAssistant(status: Status, campaignEnabled: boolean): string[] {
  if (status === 'ok') {
    return [
      'Tanı: Senaryo hedef kârı karşılıyor.',
      'Öneri: Reklam ve kargo kalemlerini küçük adımlarla optimize ederek marjı koru.',
      `Kontrol: ${campaignEnabled ? 'Kampanya açıkken efektif fiyat ve KDV hariç net satış hesabını kontrol et' : 'Satış fiyatının KDV dahil, maliyetlerin gider bazlı işlendiğini doğrula'}.`
    ];
  }

  if (status === 'weak') {
    return [
      'Tanı: Senaryo pozitif ama hedef kârın altında.',
      'Öneri: İndirim/kupon derinliğini azaltıp kargo ve reklam bütçesini yeniden dengele.',
      'Kontrol: Komisyon oranının kategoriyle uyumlu olduğunu, satış fiyatının KDV dahil kabul edildiğini ve net satışın KDV hariç hesaplandığını teyit et.'
    ];
  }

  return [
    'Tanı: Senaryo mevcut parametrelerde zararda.',
    'Öneri: Önce kampanya maliyetini hafiflet, ardından kargo ve reklam kalemlerinde daha sürdürülebilir bir seviye dene.',
    'Kontrol: Efektif satış fiyatı, KDV hariç net satış ve komisyon hesabını adım adım doğrulayarak zarar kaynağını netleştir.'
  ];
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

function toneBySingleStatus(status: Status): 'success' | 'warning' | 'danger' {
  if (status === 'ok') return 'success';
  if (status === 'weak') return 'warning';
  return 'danger';
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
