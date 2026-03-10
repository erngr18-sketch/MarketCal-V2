import { generateListingSummary } from '@/lib/listing-analysis/summary';
import type { ListingAnalysisSummaryInput, ListingPriceStats, ListingSourceType } from '@/lib/listing-analysis/types';

type BuildListingSummaryInput = {
  sourceType: ListingSourceType;
  normalizedUrl?: string;
  stats: ListingPriceStats;
  myPrice: number;
  netProfit?: number;
  targetGap?: number;
  suggestedPrice?: number;
};

export async function buildListingSummary(input: BuildListingSummaryInput): Promise<string> {
  const summaryInput: ListingAnalysisSummaryInput = {
    sourceType: input.sourceType,
    normalizedUrl: input.normalizedUrl,
    stats: input.stats,
    myPrice: input.myPrice,
    bandLabel: bandLabelByPrice(input.myPrice, input.stats),
    segmentLabel: positionLabelByPrice(input.myPrice, input.stats),
    netProfit: input.netProfit,
    targetGap: input.targetGap,
    suggestedPrice: input.suggestedPrice
  };

  return generateListingSummary(summaryInput);
}

function bandLabelByPrice(price: number, stats: ListingPriceStats): string {
  if (price < stats.q1) return 'Alt Bant';
  if (price <= stats.q3) return 'Orta Seviye';
  return 'Üst Bant';
}

function positionLabelByPrice(price: number, stats: ListingPriceStats): string {
  const position = normalizePosition(price, stats.min, stats.max);
  if (position <= 0.25) return 'Alt Bant';
  if (position <= 0.75) return 'Orta Seviye';
  return 'Üst Bant';
}

function normalizePosition(value: number, min: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max) || max <= min) return 0.5;
  return clamp((value - min) / (max - min), 0, 1);
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}
