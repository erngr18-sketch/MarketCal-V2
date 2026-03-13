'use client';

import { ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AiPanel, type AiPanelItem } from '@/app/components/ai-panel';

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
  const [activeSlide, setActiveSlide] = useState(0);
  const isCustomVat = !VAT_PRESETS.includes(values.vatRate as (typeof VAT_PRESETS)[number]);

  const result = useMemo(() => calculate(values), [values]);
  const assistantMessage = useMemo(() => buildAssistant(result.status), [result.status]);
  const assistantItems = useMemo(() => toSingleAiPanelItems(assistantMessage, result.status), [assistantMessage, result.status]);
  const carouselData = useMemo(() => buildCarouselData(values, result), [result, values]);
  const slideMeta = [
    { title: 'Özet' },
    { title: 'Gider Dağılımı' },
    { title: 'Başabaş ve Adet Bazlı Kâr' }
  ];

  const onNumberChange = (key: keyof Omit<SingleInput, 'campaignEnabled'>, raw: string) => {
    const numeric = Number(raw);
    const safe = Number.isFinite(numeric) ? numeric : 0;

    setValues((prev) => {
      const next: SingleInput = { ...prev, [key]: safe };

      next.commissionRate = clamp(next.commissionRate, 0, 100);
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
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-stretch">
      <section className="card p-6">
        <div className="card-header">
          <h2 className="card-title">Ürün Senaryosu</h2>
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
              max={100}
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
                  className={active ? 'badge bg-[#10399c] text-white' : 'badge bg-white text-slate-700'}
                >
                  %{rate}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => onVatPresetSelect('custom')}
              className={isCustomVat ? 'badge bg-[#10399c] text-white' : 'badge bg-white text-slate-700'}
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
        <AiPanel items={assistantItems} />

        <section className="card p-6 lg:flex-1">
          <div className="min-h-[360px]">
            {activeSlide === 0 ? (
              <SummarySlide
                netProfit={result.netProfit}
                netSales={result.netSales}
                status={result.status}
                highlights={carouselData.summary.highlights}
                onSelectSlide={setActiveSlide}
              />
            ) : null}

            {activeSlide === 1 ? <ExpenseSlide data={carouselData.expenses} /> : null}
            {activeSlide === 2 ? <BreakEvenSlide data={carouselData.breakEven} /> : null}
          </div>

          <div className="mt-4 flex items-center justify-center gap-2">
            {slideMeta.map((slide, index) => (
              <button
                key={slide.title}
                type="button"
                onClick={() => setActiveSlide(index)}
                className={`h-2.5 rounded-full transition ${index === activeSlide ? 'w-6 bg-[#10399c]' : 'w-2.5 bg-slate-300 hover:bg-slate-400'}`}
                aria-label={`${index + 1}. kart: ${slide.title}`}
              />
            ))}
          </div>

          <p className="mt-4 text-xs text-slate-500">Satış fiyatı KDV dahil kabul edilir. Hesaplar anlık güncellenir.</p>
        </section>
      </aside>
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

function MetricRow({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className={`flex items-start justify-between gap-4 ${compact ? '' : 'border-b border-slate-100 pb-3 last:border-b-0 last:pb-0'}`}>
      <p className="text-sm text-slate-600">{label}</p>
      <p className={`number-display text-right text-slate-900 ${compact ? 'text-sm font-semibold' : 'text-base font-semibold'}`}>{value}</p>
    </div>
  );
}

function SummarySlide({
  netProfit,
  netSales,
  status,
  highlights,
  onSelectSlide
}: {
  netProfit: number;
  netSales: number;
  status: Status;
  highlights: { title: string; text: string; slide: number }[];
  onSelectSlide: (slide: number) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xl font-semibold text-slate-900">Özet</p>
          <p className="mt-4 text-sm font-medium text-slate-500">Net Kâr</p>
          <p className="number-display mt-1 text-4xl font-semibold text-slate-900">{formatTry(netProfit)}</p>
        </div>
        <span className={statusBadgeClass(status)}>{statusLabel(status)}</span>
      </div>

      <div className="space-y-3">
        <MetricRow label="Net Satış (KDV Hariç)" value={formatTry(netSales)} />
      </div>

      <div className="space-y-3 border-t border-slate-200 pt-4">
        <h3 className="text-sm font-semibold text-slate-900">Öne Çıkanlar</h3>
        <div className="space-y-3">
          {highlights.map((highlight) => (
            <button
              key={highlight.title}
              type="button"
              onClick={() => onSelectSlide(highlight.slide)}
              className="flex w-full items-start justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left transition hover:border-slate-300 hover:bg-slate-100"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">{highlight.title}</p>
                <p className="mt-1 text-sm text-slate-600">{highlight.text}</p>
              </div>
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ExpenseSlide({
  data
}: {
  data: {
    title: string;
    expenses: { label: string; value: string; amount: number; color: string }[];
    note: string;
  };
}) {
  const total = data.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const radius = 82;
  let startAngle = -Math.PI / 2;

  return (
    <div className="space-y-2">
      <div>
        <p className="text-xl font-semibold text-slate-900">{data.title}</p>
      </div>

      <div className="space-y-1">
        <div className="mb-[-18px] flex items-start justify-center -mt-1">
          <div className="relative h-64 w-64">
            <svg viewBox="0 0 200 200" className="h-full w-full">
              {total > 0
                ? data.expenses.map((expense) => {
                    const sliceAngle = (expense.amount / total) * Math.PI * 2;
                    const endAngle = startAngle + sliceAngle;
                    const path = describePieSlice(100, 100, radius, startAngle, endAngle);
                    const labelAngle = startAngle + sliceAngle / 2;
                    const labelX = 100 + Math.cos(labelAngle) * radius * 0.68;
                    const labelY = 100 + Math.sin(labelAngle) * radius * 0.68;
                    const displayValue = formatCompactTry(expense.amount);
                    startAngle = endAngle;

                    return (
                      <g key={expense.label}>
                        <path d={path} fill={expense.color} stroke="#ffffff" strokeWidth="2" />
                        <text
                          x={labelX}
                          y={labelY}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="fill-white text-[11px] font-semibold"
                        >
                          {displayValue}
                        </text>
                      </g>
                    );
                  })
                : (
                  <circle cx="100" cy="100" r={radius} fill="#e2e8f0" />
                )}
            </svg>
          </div>
        </div>

        <div className="space-y-0.5">
          {data.expenses.map((expense) => (
            <div key={expense.label} className="flex items-center justify-between gap-4 border-b border-slate-100 py-1 last:border-b-0">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: expense.color }} aria-hidden />
                <p className="text-sm font-medium text-slate-700">{expense.label}</p>
              </div>
              <div className="text-right">
                <p className="number-display text-sm font-semibold text-slate-900">{expense.value}</p>
                <p className="text-xs font-medium text-slate-500">
                  %{total > 0 ? Math.round((expense.amount / total) * 100) : 0}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-200 pt-1.5">
          <div className="flex items-center justify-between gap-4 py-0.5">
            <p className="text-sm font-medium text-slate-600">Toplam Gider</p>
            <div className="text-right">
              <p className="number-display text-sm font-semibold text-slate-900">{formatTry(total)}</p>
              <p className="text-xs font-medium text-slate-500">%100</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white px-4 py-4">
        <p className="text-sm font-semibold text-slate-900">Not</p>
        <p className="mt-2 text-sm text-slate-600">{data.note}</p>
      </div>
    </div>
  );
}

function BreakEvenSlide({
  data
}: {
  data: {
    title: string;
    unitProfit: string;
    status: Status;
    breakEven: string;
    volumes: { label: string; value: string }[];
  };
}) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xl font-semibold text-slate-900">{data.title}</p>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">Birim Kâr</p>
          <p className="number-display mt-1 text-4xl font-semibold text-slate-900">{data.unitProfit}</p>
        </div>
        <span className={statusBadgeClass(data.status)}>{statusLabel(data.status)}</span>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Başabaş Noktası</p>
          <p className="mt-1 text-sm text-slate-600">{data.breakEven}</p>
        </div>

        <div className="border-t border-slate-200 pt-4">
          <p className="text-sm font-semibold text-slate-900">Adet Bazlı Kâr</p>
          <div className="mt-3 space-y-2">
            {data.volumes.map((volume) => (
              <MetricRow key={volume.label} label={volume.label} value={volume.value} compact />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function calculate(input: SingleInput) {
  const discountRate = input.campaignEnabled ? clamp(input.discountRate, 0, 100) : 0;
  const couponValue = input.campaignEnabled ? Math.max(0, input.couponValue) : 0;
  const vatRate = Math.max(0, input.vatRate);

  const effectivePrice = Math.max(0, input.salesPrice - input.salesPrice * (discountRate / 100) - couponValue);
  const netSales = effectivePrice / (1 + vatRate / 100);
  const commission = effectivePrice * (clamp(input.commissionRate, 0, 100) / 100);
  const netProfit = netSales - (input.costPrice + input.shippingCost + input.advertisingCost + commission);
  const marginPct = netSales > 0 ? (netProfit / netSales) * 100 : 0;

  const status: Status = netProfit < 0 ? 'loss' : netProfit >= input.targetProfit ? 'ok' : 'weak';

  return {
    effectivePrice,
    netSales,
    commission,
    netProfit,
    marginPct,
    status
  };
}

function describePieSlice(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const startX = cx + radius * Math.cos(startAngle);
  const startY = cy + radius * Math.sin(startAngle);
  const endX = cx + radius * Math.cos(endAngle);
  const endY = cy + radius * Math.sin(endAngle);
  const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;

  return [
    `M ${cx} ${cy}`,
    `L ${startX} ${startY}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`,
    'Z'
  ].join(' ');
}

function buildCarouselData(input: SingleInput, result: ReturnType<typeof calculate>) {
  const expenses = [
    { label: `Komisyon (%${clamp(input.commissionRate, 0, 100)})`, amount: result.commission },
    { label: 'Kargo', amount: Math.max(0, input.shippingCost) },
    { label: 'Reklam', amount: Math.max(0, input.advertisingCost) },
    { label: 'Maliyet', amount: Math.max(0, input.costPrice) }
  ];

  const dominantExpense = [...expenses].sort((a, b) => b.amount - a.amount)[0];
  const expenseShare = result.netSales > 0 ? (dominantExpense.amount / result.netSales) * 100 : 0;
  const breakEvenUnits =
    result.netProfit > 0 && input.targetProfit > 0 ? Math.ceil(input.targetProfit / result.netProfit) : null;

  return {
    summary: {
      title: 'Özet',
      highlights: [
        {
          title: 'Gider Dağılımı',
          text:
            dominantExpense.amount <= 0
              ? 'Belirgin bir gider baskısı görünmüyor.'
              : `${dominantExpense.label} net satışın %${expenseShare.toFixed(0)} kadarını götürüyor.`,
          slide: 1
        },
        {
          title: 'Başabaş Noktası',
          text: breakEvenUnits ? `Başabaş noktası: ${breakEvenUnits} satış` : 'Bu fiyatla başabaşa ulaşılamaz',
          slide: 2
        },
        {
          title: 'Adet Bazlı Kâr',
          text: `100 satışta yaklaşık ${formatTry(result.netProfit * 100)} ${result.netProfit >= 0 ? 'kâr' : 'zarar'}`,
          slide: 2
        }
      ]
    },
    expenses: {
      title: 'Gider Dağılımı',
      expenses: [...expenses]
        .sort((a, b) => b.amount - a.amount)
        .map((expense) => ({
          label: expense.label,
          value: formatTry(expense.amount),
          amount: expense.amount,
          color: expense.label.startsWith('Komisyon')
            ? '#10399c'
            : expense.label === 'Kargo'
              ? '#f59e0b'
              : expense.label === 'Reklam'
                ? '#8b5cf6'
                : '#0f766e'
        })),
      note:
        dominantExpense.amount <= 0
          ? 'Gider kalemleri şu an kârlılığı baskılamıyor.'
          : `${dominantExpense.label} net satışın %${expenseShare.toFixed(0)} kadarını eritiyor.`
    },
    breakEven: {
      title: 'Başabaş ve Adet Bazlı Kâr',
      unitProfit: formatTry(result.netProfit),
      status: result.status,
      breakEven: breakEvenUnits ? `${breakEvenUnits} satış` : 'Bu fiyatla başabaşa ulaşılamaz',
      volumes: [
        { label: '50 adet', value: formatTry(result.netProfit * 50) },
        { label: '100 adet', value: formatTry(result.netProfit * 100) },
        { label: '250 adet', value: formatTry(result.netProfit * 250) }
      ]
    }
  };
}

function buildAssistant(status: Status): string[] {
  if (status === 'ok') {
    return [
      'Tanı: Senaryo hedef kârı karşılıyor.',
      'Öneri: Reklam ve kargo kalemlerini küçük adımlarla optimize ederek marjı koru.',
      'Kontrol: Mevcut yapı kârlı görünüyor. Komisyon ve gider kalemlerini düzenli kontrol ederek marjı koru.'
    ];
  }

  if (status === 'weak') {
    return [
      'Tanı: Senaryo pozitif ama hedef kârın altında.',
      'Öneri: İndirim/kupon derinliğini azaltıp kargo ve reklam bütçesini yeniden dengele.',
      'Kontrol: Marj dar görünüyor. Komisyon, kargo ve reklam giderlerini panelden kontrol ederek küçük sapmaları izle.'
    ];
  }

  return [
    'Tanı: Senaryo mevcut parametrelerde zararda.',
    'Öneri: Önce kampanya maliyetini hafiflet, ardından kargo ve reklam kalemlerinde daha sürdürülebilir bir seviye dene.',
    'Kontrol: Zararın hangi kalemden kaynaklandığını netleştirmek için komisyon, kargo ve reklam değerlerini panelden doğrula.'
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
  if (status === 'ok') return 'Kârda';
  if (status === 'weak') return 'Sınırda';
  return 'Zarar';
}

function statusBadgeClass(status: Status) {
  if (status === 'ok') return 'badge bg-emerald-100 text-emerald-700';
  if (status === 'weak') return 'badge bg-amber-100 text-amber-700';
  return 'badge bg-rose-100 text-rose-700';
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

function formatCompactTry(value: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0
  }).format(Number.isFinite(value) ? value : 0);
}
