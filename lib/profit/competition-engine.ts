import type { ProfitStatus } from '@/lib/profit/compare-engine';
import { validateListingUrl } from '@/lib/listing-analysis/validate-url';

export type CompetitionMode = 'best_sellers' | 'most_reviewed';
export type CompetitionDataSource = 'simulation' | 'manual';

export type CompetitionStats = {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
};

export type CompetitionManualPrices = {
  rival1?: number;
  rival2?: number;
  rival3?: number;
};

export type CompetitionInput = {
  listingUrl?: string;
  mode: CompetitionMode;
  myPrice: number;
  source: CompetitionDataSource;
  manualPrices?: CompetitionManualPrices;
};

export type CompetitionOutput = {
  mode: CompetitionMode;
  source: CompetitionDataSource;
  myPrice: number;
  stats: CompetitionStats;
  myPercentile: number;
  segment: ProfitStatus;
  segmentLabel: string;
  bandLabel: string;
  assistantMessage: string;
  normalizedUrl?: string;
};

export function runCompetition(input: CompetitionInput): CompetitionOutput {
  const safeMyPrice = Math.max(0, round2(input.myPrice));
  const validation = validateListingUrl(input.listingUrl ?? '');

  if (!validation.ok) {
    throw new Error(validation.reason ?? 'Link okunamadı. Trendyol kategori veya arama sonucu linki gir.');
  }

  const stats =
    input.source === 'manual'
      ? buildManualStats(input.manualPrices)
      : buildSimulatedStats(validation.normalizedUrl ?? '', input.mode);

  const normalizedPosition = normalizePosition(safeMyPrice, stats.min, stats.max);
  const myPercentile = Math.round(normalizedPosition * 100);
  const segment = segmentFromPosition(normalizedPosition);

  return {
    mode: input.mode,
    source: input.source,
    myPrice: safeMyPrice,
    stats,
    myPercentile,
    segment,
    segmentLabel: segmentLabel(segment),
    bandLabel: bandLabelByPrice(safeMyPrice, stats),
    assistantMessage: buildAssistantMessage(segment, stats, safeMyPrice),
    normalizedUrl: validation.ok ? validation.normalizedUrl : undefined
  };
}

export function formatTry(value: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 2
  }).format(Number.isFinite(value) ? value : 0);
}

function buildManualStats(manualPrices: CompetitionManualPrices | undefined): CompetitionStats {
  if (!manualPrices) {
    throw new Error('Manuel mod için en az 1 rakip fiyat girin.');
  }

  const values = [manualPrices.rival1, manualPrices.rival2, manualPrices.rival3]
    .map((value) => (Number.isFinite(value) ? Math.max(0, Number(value)) : 0))
    .filter((value) => value > 0)
    .sort((a, b) => a - b);

  if (values.length < 1) {
    throw new Error('Manuel mod için en az 1 rakip fiyat girin.');
  }

  const low = values[0];
  const high = values[values.length - 1];
  const mid = values.length === 1 ? values[0] : values.length === 2 ? (values[0] + values[1]) / 2 : values[1];

  return {
    min: round2(low),
    q1: round2(low + (mid - low) * 0.5),
    median: round2(mid),
    q3: round2(mid + (high - mid) * 0.5),
    max: round2(high)
  };
}

function buildSimulatedStats(normalizedUrl: string, mode: CompetitionMode): CompetitionStats {
  const seed = hashString(`${normalizedUrl}:${mode}`);
  const rnd = createSeededRandom(seed);

  const base = mode === 'best_sellers' ? 520 : 590;
  const spreadFactor = mode === 'best_sellers' ? 0.95 : 1.05;

  const min = round2(Math.max(30, base * (0.52 + rnd() * 0.18)));
  const median = round2(min * (1.25 + rnd() * 0.22));
  const max = round2(median * (1.35 + rnd() * 0.35) * spreadFactor);

  const q1 = round2(min + (median - min) * (0.45 + rnd() * 0.1));
  const q3 = round2(median + (max - median) * (0.45 + rnd() * 0.1));

  return {
    min,
    q1,
    median,
    q3,
    max
  };
}

function buildAssistantMessage(segment: ProfitStatus, stats: CompetitionStats, myPrice: number): string {
  const lines: string[] = [];

  lines.push(`🧭 Fiyatının pazardaki yeri: ${segmentLabel(segment)}.`);

  if (segment === 'top') {
    lines.push('✅ Fiyatın pazardaki çoğu üründen daha düşük görünüyor. Bu satış ihtimalini artırabilir, ama marjı kontrol et.');
  } else if (segment === 'on_target') {
    lines.push('✅ Fiyatın pazar ortalığına yakın. Bu genelde en dengeli bölgedir.');
  } else if (segment === 'borderline') {
    lines.push('✅ Fiyatın pazardaki birçok üründen daha yüksek. Ürün değerini iyi anlatman gerekebilir.');
  } else {
    lines.push('✅ Fiyatın pazardaki birçok üründen daha yüksek. Ürün değerini iyi anlatman gerekebilir.');
  }

  if (myPrice < stats.q1) {
    lines.push('⚠️ Alt banttasın; fiyat avantajın var ama kârlılığı yakından izle.');
  } else if (myPrice > stats.q3) {
    lines.push('⚠️ Üst banttasın; müşteriye neden daha pahalı olduğunu net göstermen gerekebilir.');
  }

  lines.push('⚠️ Hesaplama KDV hariç net satış üzerinden yapılır.');
  lines.push('⚠️ Bu bir tahmindir; Trendyol sonuçları kişiye göre değişebilir.');

  return lines.join('\n');
}

function segmentFromPosition(position: number): ProfitStatus {
  if (position <= 0.2) return 'top';
  if (position <= 0.6) return 'on_target';
  if (position <= 0.85) return 'borderline';
  return 'loss';
}

function segmentLabel(segment: ProfitStatus): string {
  if (segment === 'top') return 'En Karlı';
  if (segment === 'on_target') return 'Hedefte';
  if (segment === 'borderline') return 'Sınırda';
  return 'Zararda';
}

function bandLabelByPrice(price: number, stats: CompetitionStats): string {
  if (price < stats.q1) return 'Alt Bant';
  if (price <= stats.q3) return 'Orta Seviye';
  return 'Üst Bant';
}

function normalizePosition(value: number, min: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max) || max <= min) return 0.5;
  return clamp((value - min) / (max - min), 0, 1);
}

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}
