import type { ProfitStatus } from '@/lib/profit/compare-engine';

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
  url?: string;
  mode: CompetitionMode;
  myPrice: number;
  source: CompetitionDataSource;
  manualPrices?: CompetitionManualPrices;
};

export type UrlValidationResult = {
  ok: boolean;
  reason?: string;
  normalizedUrl?: string;
  sourceLabel?: string;
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

const ALLOWED_HOSTS = new Set(['trendyol.com', 'www.trendyol.com']);
const NOISE_PARAM_NAMES = new Set(['gclid', 'fbclid']);

export function validateTrendyolUrl(rawUrl: string): UrlValidationResult {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { ok: false };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, reason: 'Link okunamadı. Geçerli bir kategori linki girin.' };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { ok: false, reason: 'Link http veya https ile başlamalı.' };
  }

  if (!ALLOWED_HOSTS.has(parsed.hostname.toLowerCase())) {
    return { ok: false, reason: 'Şimdilik yalnızca Trendyol kategori linki kullanılabilir.' };
  }

  const pathname = parsed.pathname.toLowerCase();
  const full = parsed.toString().toLowerCase();
  const isSlugCategoryPath = /^\/[^/]+-x-c\d+(\/)?$/.test(pathname);

  if (pathname.includes('-p-') || full.includes('-p-')) {
    return { ok: false, reason: 'Ürün sayfası yerine kategori linki ekleyin.' };
  }

  const isSearchPath = pathname === '/sr' || pathname === '/sr/';
  const isCategoryPath = pathname.startsWith('/butik/liste') || pathname.startsWith('/kategori');

  if (!isSearchPath && !isCategoryPath && !isSlugCategoryPath) {
    return { ok: false, reason: 'Bu link kategori sayfası gibi görünmüyor.' };
  }

  if (isSearchPath) {
    const hasSearchQuery = ['q', 'qt', 'st'].some((key) => {
      const value = parsed.searchParams.get(key);
      return typeof value === 'string' && value.trim().length > 0;
    });
    if (!hasSearchQuery) return { ok: false, reason: 'Arama linkinde sorgu bilgisi eksik görünüyor.' };
  }

  return {
    ok: true,
    normalizedUrl: normalizeTrendyolUrl(parsed),
    sourceLabel: 'Trendyol'
  };
}

export function normalizeTrendyolUrl(urlOrRaw: string | URL): string {
  const parsed = typeof urlOrRaw === 'string' ? new URL(urlOrRaw.trim()) : new URL(urlOrRaw.toString());
  const params = Array.from(parsed.searchParams.entries())
    .filter(([key]) => !key.toLowerCase().startsWith('utm_') && !NOISE_PARAM_NAMES.has(key.toLowerCase()))
    .sort(([a], [b]) => a.localeCompare(b, 'tr'));

  const normalizedParams = new URLSearchParams(params);
  const query = normalizedParams.toString();
  return `${parsed.protocol}//${parsed.hostname}${parsed.pathname}${query ? `?${query}` : ''}`;
}

export function runCompetition(input: CompetitionInput): CompetitionOutput {
  const safeMyPrice = Math.max(0, round2(input.myPrice));
  const validation = input.source === 'manual' ? { ok: true as const } : validateTrendyolUrl(input.url ?? '');

  if (!validation.ok) {
    throw new Error(validation.reason ?? 'Geçerli bir kategori linki girin.');
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

  lines.push(`🧭 Fiyatın pazara göre: ${segmentLabel(segment)}.`);

  if (segment === 'top') {
    lines.push('✅ Fiyatın alt bantta; görünürlük ve dönüşüm için avantajlı olabilir.');
  } else if (segment === 'on_target') {
    lines.push('✅ Bu seviyede dönüşüm ve marj dengesi genelde daha stabil kalır.');
  } else if (segment === 'borderline') {
    lines.push('✅ Fiyatın üst banda yakın; ürün değerini net anlatmak dönüşümü korur.');
  } else {
    lines.push('✅ Fiyatın üst bantta; marjı korurken talep etkisini küçük testlerle ölç.');
  }

  if (myPrice < stats.q1) {
    lines.push('⚠️ Pazar alt bandının altındasın; marj tarafını yakından takip et.');
  } else if (myPrice > stats.q3) {
    lines.push('⚠️ Pazar üst bandının üzerindesin; tıklama ve dönüşümde düşüş riski olabilir.');
  }

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
  if (price < stats.q1) return 'Q1 altı';
  if (price <= stats.q3) return 'Q1-Q3 arası';
  return 'Q3 üstü';
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
