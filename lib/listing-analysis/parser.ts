import type { ListingPriceParseMetadata, ListingSourceType, SummaryConfidence } from '@/lib/listing-analysis/types';
import { ListingAnalysisError } from '@/lib/listing-analysis/types';
import { round2 } from '@/lib/profit/pricing-engine';

const MIN_REQUIRED_PRICE_COUNT = 6;
const MIN_UNIQUE_PRICE_COUNT = 3;
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
    throw new ListingAnalysisError('EMPTY_HTML', 'Listing içeriği boş geldi; fiyatlar çıkarılamadı.');
  }

  if (sourceType !== 'trendyol') {
    throw new ListingAnalysisError('UNSUPPORTED_SOURCE', 'Bu kaynak için fiyat çıkarma henüz hazır değil.');
  }

  const prices = collectMatches(html, TRENDYOL_PRICE_PATTERNS);
  if (prices.length < MIN_REQUIRED_PRICE_COUNT) {
    throw new ListingAnalysisError('INSUFFICIENT_PRICES', 'Yeterli fiyat verisi bulunamadı.');
  }

  const metadata = buildListingPriceMetadata(prices);
  ensurePriceQuality(metadata);

  return prices;
}

export function buildListingPriceMetadata(prices: number[]): ListingPriceParseMetadata {
  const validPrices = prices
    .filter((price) => Number.isFinite(price) && price >= MIN_REASONABLE_PRICE && price <= MAX_REASONABLE_PRICE)
    .sort((a, b) => a - b);

  const uniquePricesCount = new Set(validPrices).size;
  const min = validPrices[0] ?? 0;
  const max = validPrices[validPrices.length - 1] ?? 0;
  const rangeRatio = min > 0 ? round2(max / min) : 0;

  let parseConfidence: SummaryConfidence = 'high';
  if (validPrices.length < 10 || uniquePricesCount < 4) {
    parseConfidence = 'medium';
  }
  if (
    validPrices.length < MIN_REQUIRED_PRICE_COUNT ||
    uniquePricesCount < MIN_UNIQUE_PRICE_COUNT ||
    uniquePricesCount / Math.max(validPrices.length, 1) < 0.35 ||
    rangeRatio > 120
  ) {
    parseConfidence = 'low';
  }

  return {
    pricesCount: validPrices.length,
    uniquePricesCount,
    rangeRatio,
    parseConfidence
  };
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
  if (prices.length >= MIN_REQUIRED_PRICE_COUNT && filtered.length < MIN_REQUIRED_PRICE_COUNT) {
    throw new ListingAnalysisError('OUTLIER_COLLAPSE', 'Outlier temizliği sonrası veri çok zayıf kaldı.');
  }

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

function ensurePriceQuality(metadata: ListingPriceParseMetadata) {
  if (metadata.pricesCount < MIN_REQUIRED_PRICE_COUNT) {
    throw new ListingAnalysisError('INSUFFICIENT_PRICES', 'Yeterli fiyat verisi bulunamadı.');
  }

  if (metadata.uniquePricesCount < MIN_UNIQUE_PRICE_COUNT) {
    throw new ListingAnalysisError('LOW_CONFIDENCE_PARSE', 'Bulunan fiyatlar güvenilir görünmüyor.');
  }

  if (metadata.parseConfidence === 'low') {
    throw new ListingAnalysisError('LOW_CONFIDENCE_PARSE', 'Bulunan fiyatlar güvenilir görünmüyor.');
  }
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
