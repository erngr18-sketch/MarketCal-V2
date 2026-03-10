import type { ListingSourceType } from '@/lib/listing-analysis/types';
import { round2 } from '@/lib/profit/pricing-engine';

const MIN_REQUIRED_PRICE_COUNT = 6;
const MIN_REASONABLE_PRICE = 5;
const MAX_REASONABLE_PRICE = 250_000;
const MAX_SEQUENTIAL_REPEAT = 3;

const TRENDYOL_PRICE_PATTERNS: RegExp[] = [
  /"discountedPrice"\s*:\s*"([^"]+)"/g,
  /"sellingPrice"\s*:\s*"([^"]+)"/g,
  /"priceText"\s*:\s*"([^"]+)"/g,
  /"price"\s*:\s*\{\s*"value"\s*:\s*"([^"]+)"\s*,\s*"currency"\s*:\s*"TRY"/g,
  /"value"\s*:\s*"([^"]+)"\s*,\s*"currency"\s*:\s*"TRY"/g,
  /"price"\s*:\s*"([^"]+)"/g
];

export function extractListingPrices(html: string, sourceType: ListingSourceType): number[] {
  if (!html.trim()) {
    throw new Error('Listing içeriği boş geldi; fiyatlar çıkarılamadı.');
  }

  if (sourceType !== 'trendyol') {
    throw new Error('Bu kaynak için fiyat çıkarma henüz hazır değil.');
  }

  const prices = collectMatches(html, TRENDYOL_PRICE_PATTERNS);
  if (prices.length < MIN_REQUIRED_PRICE_COUNT) {
    throw new Error('Yeterli ve güvenilir fiyat verisi bulunamadı. Farklı bir kategori veya arama linki dene.');
  }

  return prices;
}

function collectMatches(html: string, patterns: RegExp[]): number[] {
  const prices: number[] = [];

  for (const pattern of patterns) {
    let repeatedCount = 0;
    let previousValue: number | null = null;

    for (const match of html.matchAll(pattern)) {
      const candidate = parsePrice(match[1] ?? '');
      if (candidate === null) {
        continue;
      }

      if (previousValue !== null && candidate === previousValue) {
        repeatedCount += 1;
      } else {
        repeatedCount = 1;
        previousValue = candidate;
      }

      if (repeatedCount > MAX_SEQUENTIAL_REPEAT) {
        continue;
      }

      prices.push(candidate);
    }
  }

  const filtered = filterOutliers(prices);
  return filtered.sort((a, b) => a - b);
}

function parsePrice(raw: string): number | null {
  const normalized = raw
    .replace(/\s+/g, '')
    .replace(/&quot;/g, '')
    .replace(/TL|₺|TRY/gi, '')
    .replace(/\./g, '')
    .replace(/,/g, '.')
    .trim();

  if (!normalized || !/^\d+(\.\d+)?$/.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < MIN_REASONABLE_PRICE || parsed > MAX_REASONABLE_PRICE) {
    return null;
  }

  return round2(parsed);
}

function filterOutliers(prices: number[]): number[] {
  const sorted = prices
    .filter((price) => Number.isFinite(price) && price >= MIN_REASONABLE_PRICE && price <= MAX_REASONABLE_PRICE)
    .sort((a, b) => a - b);

  if (sorted.length < MIN_REQUIRED_PRICE_COUNT) {
    return sorted;
  }

  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;

  if (!Number.isFinite(iqr) || iqr <= 0) {
    return sorted;
  }

  const lowerBound = Math.max(MIN_REASONABLE_PRICE, q1 - iqr * 1.5);
  const upperBound = Math.min(MAX_REASONABLE_PRICE, q3 + iqr * 1.5);
  const trimmed = sorted.filter((price) => price >= lowerBound && price <= upperBound);

  return trimmed.length >= MIN_REQUIRED_PRICE_COUNT ? trimmed : sorted;
}

function quantile(sorted: number[], percentile: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];

  const index = (sorted.length - 1) * percentile;
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);
  const lowerValue = sorted[lowerIndex];
  const upperValue = sorted[upperIndex];

  if (lowerIndex === upperIndex) {
    return lowerValue;
  }

  const weight = index - lowerIndex;
  return lowerValue + (upperValue - lowerValue) * weight;
}
