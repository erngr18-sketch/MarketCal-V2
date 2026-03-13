'use client';

import { MoreHorizontal, Search, Sparkles, TriangleAlert, TrendingUp, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { routeLabels, routes } from '@/lib/routes';

type ProductStatus = 'Karlı' | 'Riskli' | 'Zarar';

type ProductRow = {
  id: string;
  productName: string;
  variant: string;
  category: string;
  label: string;
  barcode: string;
  sku: string;
  salesPrice: number;
  costPrice: number;
  commissionRate: number;
  shippingCost: number;
  advertisingCost: number;
  netProfit: number;
  status: ProductStatus;
};

const PRODUCT_ROWS: ProductRow[] = [
  {
    id: 'hoodie-black-l',
    productName: 'Kapüşonlu Kazak',
    variant: 'Siyah / L',
    category: 'Kazak',
    label: 'Kış Koleksiyonu',
    barcode: '8690001001001',
    sku: '',
    salesPrice: 1249,
    costPrice: 540,
    commissionRate: 21,
    shippingCost: 38,
    advertisingCost: 52,
    netProfit: 356,
    status: 'Karlı'
  },
  {
    id: 'hoodie-black-xl',
    productName: 'Kapüşonlu Kazak',
    variant: 'Siyah / XL',
    category: 'Kazak',
    label: 'Kış Koleksiyonu',
    barcode: '8690001001002',
    sku: 'HK-BLK-XL',
    salesPrice: 1249,
    costPrice: 555,
    commissionRate: 21,
    shippingCost: 38,
    advertisingCost: 60,
    netProfit: 318,
    status: 'Riskli'
  },
  {
    id: 'tee-white-m',
    productName: 'Oversize T-Shirt',
    variant: 'Beyaz / M',
    category: 'T-Shirt',
    label: 'Temel Seri',
    barcode: '8690001001003',
    sku: 'TS-WHT-M',
    salesPrice: 499,
    costPrice: 235,
    commissionRate: 19,
    shippingCost: 24,
    advertisingCost: 41,
    netProfit: 104,
    status: 'Riskli'
  },
  {
    id: 'tee-black-l',
    productName: 'Oversize T-Shirt',
    variant: 'Siyah / L',
    category: 'T-Shirt',
    label: 'Temel Seri',
    barcode: '8690001001004',
    sku: '',
    salesPrice: 479,
    costPrice: 238,
    commissionRate: 19,
    shippingCost: 24,
    advertisingCost: 45,
    netProfit: 81,
    status: 'Riskli'
  },
  {
    id: 'sneaker-42',
    productName: 'Urban Sneaker',
    variant: 'Beyaz / 42',
    category: 'Sneaker',
    label: 'Premium',
    barcode: '8690001001005',
    sku: 'SN-WHT-42',
    salesPrice: 1890,
    costPrice: 820,
    commissionRate: 17,
    shippingCost: 46,
    advertisingCost: 70,
    netProfit: 633,
    status: 'Karlı'
  },
  {
    id: 'sneaker-43',
    productName: 'Urban Sneaker',
    variant: 'Beyaz / 43',
    category: 'Sneaker',
    label: 'Premium',
    barcode: '8690001001006',
    sku: 'SN-WHT-43',
    salesPrice: 1890,
    costPrice: 835,
    commissionRate: 17,
    shippingCost: 46,
    advertisingCost: 72,
    netProfit: 615,
    status: 'Karlı'
  },
  {
    id: 'bag-tan-std',
    productName: 'Mini Çapraz Çanta',
    variant: 'Taba / Standart',
    category: 'Aksesuar',
    label: 'Aksesuar',
    barcode: '8690001001007',
    sku: '',
    salesPrice: 799,
    costPrice: 275,
    commissionRate: 14,
    shippingCost: 21,
    advertisingCost: 18,
    netProfit: 373,
    status: 'Karlı'
  },
  {
    id: 'bag-black-std',
    productName: 'Mini Çapraz Çanta',
    variant: 'Siyah / Standart',
    category: 'Aksesuar',
    label: 'Aksesuar',
    barcode: '8690001001008',
    sku: 'BG-BLK-STD',
    salesPrice: 799,
    costPrice: 280,
    commissionRate: 14,
    shippingCost: 21,
    advertisingCost: 22,
    netProfit: 364,
    status: 'Karlı'
  },
  {
    id: 'shirt-blue-s',
    productName: 'Keten Gömlek',
    variant: 'Mavi / S',
    category: 'Gömlek',
    label: 'Yaz Koleksiyonu',
    barcode: '8690001001009',
    sku: 'GM-MAV-S',
    salesPrice: 899,
    costPrice: 410,
    commissionRate: 18,
    shippingCost: 29,
    advertisingCost: 48,
    netProfit: 250,
    status: 'Karlı'
  },
  {
    id: 'shirt-blue-m',
    productName: 'Keten Gömlek',
    variant: 'Mavi / M',
    category: 'Gömlek',
    label: 'Yaz Koleksiyonu',
    barcode: '8690001001010',
    sku: 'GM-MAV-M',
    salesPrice: 899,
    costPrice: 418,
    commissionRate: 18,
    shippingCost: 29,
    advertisingCost: 61,
    netProfit: 229,
    status: 'Riskli'
  },
  {
    id: 'jacket-grey-l',
    productName: 'Şişme Yelek',
    variant: 'Gri / L',
    category: 'Dış Giyim',
    label: 'Kış Koleksiyonu',
    barcode: '8690001001011',
    sku: '',
    salesPrice: 999,
    costPrice: 560,
    commissionRate: 20,
    shippingCost: 42,
    advertisingCost: 88,
    netProfit: 109,
    status: 'Riskli'
  },
  {
    id: 'jacket-grey-xl',
    productName: 'Şişme Yelek',
    variant: 'Gri / XL',
    category: 'Dış Giyim',
    label: 'Kış Koleksiyonu',
    barcode: '8690001001012',
    sku: 'YL-GRI-XL',
    salesPrice: 999,
    costPrice: 590,
    commissionRate: 20,
    shippingCost: 42,
    advertisingCost: 104,
    netProfit: 63,
    status: 'Zarar'
  }
];

export default function ProductsPage() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [label, setLabel] = useState('all');
  const [status, setStatus] = useState('all');

  const categories = useMemo(() => uniqueValues(PRODUCT_ROWS.map((row) => row.category)), []);
  const labels = useMemo(() => uniqueValues(PRODUCT_ROWS.map((row) => row.label)), []);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('tr');

    return PRODUCT_ROWS.filter((row) => {
      if (category !== 'all' && row.category !== category) return false;
      if (label !== 'all' && row.label !== label) return false;
      if (status !== 'all' && row.status !== status) return false;

      if (!normalizedQuery) return true;

      const haystack = [row.productName, row.variant, row.barcode, row.sku]
        .join(' ')
        .toLocaleLowerCase('tr');

      return haystack.includes(normalizedQuery);
    });
  }, [category, label, query, status]);

  const portfolioStats = useMemo(() => {
    const total = filteredRows.length;
    const profitable = filteredRows.filter((row) => row.status === 'Karlı').length;
    const risky = filteredRows.filter((row) => row.status !== 'Karlı').length;
    const averageMargin =
      total > 0
        ? filteredRows.reduce((sum, row) => sum + (row.netProfit / Math.max(row.salesPrice, 1)) * 100, 0) / total
        : 0;

    return {
      total,
      profitable,
      risky,
      averageMargin
    };
  }, [filteredRows]);

  const portfolioInsight = useMemo(() => buildPortfolioInsight(filteredRows), [filteredRows]);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold text-slate-900">Ürünler</h1>
          <p className="text-sm text-slate-600">Ürün portföyünü yönet ve kârlılık durumunu takip et</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-secondary">
            CSV Yükle
          </button>
          <button type="button" className="btn btn-primary">
            + Ürün Ekle
          </button>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Toplam Ürün" value={String(portfolioStats.total)} icon={<PackageGlyph />} />
        <MetricCard label="Karlılıkta Olan" value={String(portfolioStats.profitable)} icon={<TrendingUp className="h-4 w-4 text-emerald-600" />} />
        <MetricCard label="Riskli Ürün" value={String(portfolioStats.risky)} icon={<TriangleAlert className="h-4 w-4 text-amber-600" />} />
        <MetricCard label="Ortalama Marj" value={`%${portfolioStats.averageMargin.toFixed(1)}`} icon={<Wallet className="h-4 w-4 text-slate-600" />} />
      </section>

      <section className="card p-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-indigo-500" />
          <h2 className="card-title">AI Analiz</h2>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <InsightBlock title="En Güçlü Alan" lines={portfolioInsight.strongest} />
          <InsightBlock title="Risk Alanı" lines={portfolioInsight.risks} />
          <InsightBlock title="Aksiyon Önerisi" lines={portfolioInsight.actions} />
        </div>
      </section>

      <section className="card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="flex-1">
            <span className="relative block">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Ürün, varyant, barkod veya SKU ara"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
            <FilterSelect allLabel="Tüm Kategoriler" value={category} onChange={setCategory} options={categories} />
            <FilterSelect allLabel="Tüm Etiketler" value={label} onChange={setLabel} options={labels} />
            <FilterSelect allLabel="Tüm Durumlar" value={status} onChange={setStatus} options={['Karlı', 'Riskli', 'Zarar']} />
          </div>
        </div>
      </section>

      <section className="card overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.08em] text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Ürün</th>
              <th className="px-4 py-3 font-medium">Varyant</th>
              <th className="px-4 py-3 font-medium">Kategori</th>
              <th className="px-4 py-3 font-medium">Barkod</th>
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 font-medium">Net Kâr</th>
              <th className="px-4 py-3 font-medium">Durum</th>
              <th className="px-4 py-3 font-medium text-right">Aksiyon</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {filteredRows.map((row) => (
              <tr key={row.id} className="align-top">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{row.productName}</div>
                  <div className="mt-1 text-xs text-slate-500">{row.label}</div>
                </td>
                <td className="px-4 py-3 text-slate-700">{row.variant}</td>
                <td className="px-4 py-3 text-slate-700">{row.category}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{row.barcode}</td>
                <td className="px-4 py-3 text-slate-700">{row.sku || '-'}</td>
                <td className="px-4 py-3 font-semibold text-slate-900">{formatCurrency(row.netProfit)}</td>
                <td className="px-4 py-3">
                  <StatusPill status={row.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <details className="relative inline-block text-left">
                    <summary className="inline-flex cursor-pointer list-none items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50">
                      <MoreHorizontal className="h-4 w-4" />
                    </summary>

                    <div className="absolute right-0 z-10 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                      <ActionLink href={routes.analyses.profitScenario} label={routeLabels.profitScenario} />
                      <ActionLink href={routes.analyses.marketplaceComparison} label={routeLabels.marketplaceComparison} />
                      <ActionLink href={`${routes.analyses.marketAnalysis}?price=${row.salesPrice}`} label={routeLabels.marketAnalysis} />
                      <ActionLink href={routes.analyses.pricePosition} label={routeLabels.pricePosition} />
                    </div>
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredRows.length === 0 ? (
          <div className="border-t border-slate-100 px-4 py-6 text-sm text-slate-500">Filtrelere uyan ürün bulunamadı.</div>
        ) : null}
      </section>
    </div>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">{label}</p>
        {icon}
      </div>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function InsightBlock({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <ul className="mt-3 space-y-2 text-sm text-slate-700">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}

function FilterSelect({
  allLabel,
  value,
  onChange,
  options
}: {
  allLabel: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="block">
      <select className="input h-11" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="all">{allLabel}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function StatusPill({ status }: { status: ProductStatus }) {
  if (status === 'Karlı') {
    return <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Karlı</span>;
  }

  if (status === 'Riskli') {
    return <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">Riskli</span>;
  }

  return <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">Zarar</span>;
}

function ActionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="block rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50 hover:text-slate-900">
      {label}
    </Link>
  );
}

function buildPortfolioInsight(rows: ProductRow[]) {
  if (rows.length === 0) {
    return {
      strongest: ['Portföy görünümü için filtreleri sıfırlayın.'],
      risks: ['Seçili filtrelerde yorum üretilecek veri bulunamadı.'],
      actions: ['Aramayı genişletip tüm ürünleri yeniden değerlendirin.']
    };
  }

  const strongestCategory = topBy(rows, (row) => row.netProfit, 'category');
  const strongestLabel = topBy(rows, (row) => row.netProfit, 'label');
  const riskyCategory = weakestBy(rows, (row) => row.netProfit, 'category');
  const adHeavy = [...rows].sort((a, b) => b.advertisingCost - a.advertisingCost).slice(0, 2);
  const weakestProducts = [...rows].sort((a, b) => a.netProfit - b.netProfit).slice(0, 5);

  return {
    strongest: [
      `En güçlü kategori: ${strongestCategory.name}`,
      `En yüksek marjlı grup: ${strongestLabel.name}`
    ],
    risks: [
      `${riskyCategory.name} grubunda hedef kârın altında kalan varyantlar var.`,
      `${adHeavy.map((row) => row.productName).join(' ve ')} ürünlerinde reklam maliyeti kârlılığı aşağı çekiyor.`
    ],
    actions: [
      `Önce en düşük marjlı ${weakestProducts.length} varyantı gözden geçir.`,
      'Kargo maliyeti yüksek ürünleri filtreleyip fiyat testi planla.',
      'En kârlı ürünlerde stok ve görünürlük artışını değerlendir.'
    ]
  };
}

function topBy<T extends ProductRow>(rows: T[], getValue: (row: T) => number, key: 'category' | 'label') {
  const totals = new Map<string, number>();
  rows.forEach((row) => {
    totals.set(row[key], (totals.get(row[key]) ?? 0) + getValue(row));
  });

  const [name] = [...totals.entries()].sort((a, b) => b[1] - a[1])[0] ?? ['-'];
  return { name };
}

function weakestBy<T extends ProductRow>(rows: T[], getValue: (row: T) => number, key: 'category' | 'label') {
  const totals = new Map<string, number>();
  rows.forEach((row) => {
    totals.set(row[key], (totals.get(row[key]) ?? 0) + getValue(row));
  });

  const [name] = [...totals.entries()].sort((a, b) => a[1] - b[1])[0] ?? ['-'];
  return { name };
}

function uniqueValues(values: string[]) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, 'tr'));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 2
  }).format(value);
}

function PackageGlyph() {
  return (
    <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-slate-100 text-[10px] font-semibold text-slate-600">
      P
    </span>
  );
}
