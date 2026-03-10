import type { ListingPriceStats } from '@/lib/listing-analysis/types';
import { round2 } from '@/lib/profit/pricing-engine';

export function buildListingStats(prices: number[]): ListingPriceStats {
  const sorted = prices
    .filter((price) => Number.isFinite(price) && price > 0)
    .slice()
    .sort((a, b) => a - b);

  if (sorted.length === 0) {
    throw new Error('İstatistik oluşturmak için geçerli fiyat bulunamadı.');
  }

  return {
    min: round2(sorted[0]),
    q1: quantile(sorted, 0.25),
    median: quantile(sorted, 0.5),
    q3: quantile(sorted, 0.75),
    max: round2(sorted[sorted.length - 1])
  };
}

function quantile(sorted: number[], percentile: number): number {
  if (sorted.length === 1) {
    return round2(sorted[0]);
  }

  const index = (sorted.length - 1) * percentile;
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);
  const lowerValue = sorted[lowerIndex];
  const upperValue = sorted[upperIndex];

  if (lowerIndex === upperIndex) {
    return round2(lowerValue);
  }

  const weight = index - lowerIndex;
  return round2(lowerValue + (upperValue - lowerValue) * weight);
}
