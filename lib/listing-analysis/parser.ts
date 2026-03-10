import type { ListingSourceType } from '@/lib/listing-analysis/types';
import { round2 } from '@/lib/profit/pricing-engine';

const MIN_REQUIRED_PRICE_COUNT = 3;
const MAX_REASONABLE_PRICE = 1_000_000;

const TRENDYOL_PRICE_PATTERNS = [
  /"discountedPrice"\s*:\s*"([^"]+)"/g,
  /"sellingPrice"\s*:\s*"([^"]+)"/g,
  /"price"\s*:\s*"([^"]+)"/g,
  /"value"\s*:\s*"([^"]+)"\s*,\s*"currency"\s*:\s*"TRY"/g,
  /"price"\s*:\s*\{\s*"value"\s*:\s*"([^"]+)"/g
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
    throw new Error('Yeterli fiyat verisi bulunamadı. Farklı bir kategori veya arama linki dene.');
  }

  return prices;
}

function collectMatches(html: string, patterns: RegExp[]): number[] {
  const unique = new Set<number>();

  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const candidate = parsePrice(match[1] ?? '');
      if (candidate !== null) {
        unique.add(candidate);
      }
    }
  }

  return Array.from(unique).sort((a, b) => a - b);
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
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > MAX_REASONABLE_PRICE) {
    return null;
  }

  return round2(parsed);
}
