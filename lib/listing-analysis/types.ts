export type ListingSourceType =
  | 'trendyol'
  | 'shopify'
  | 'ticimax'
  | 'ikas'
  | 'generic'
  | 'unknown';

export type ListingPriceStats = {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
};

export type SummaryConfidence = 'high' | 'medium' | 'low';

export type DeterministicSummary = {
  headline: string;
  bullets: string[];
  warning: string;
  confidence: SummaryConfidence;
  confidenceLabel: string;
};

export type ListingAnalysisSummaryInput = {
  sourceType: ListingSourceType;
  normalizedUrl?: string;
  stats: ListingPriceStats;
  myPrice: number;
  bandLabel: string;
  segmentLabel: string;
  netProfit?: number;
  targetGap?: number;
  suggestedPrice?: number;
  pricesCount?: number;
  usedRealAnalysis?: boolean;
  usedFallback?: boolean;
};

export type CategoryAnalysisRequestBody = {
  listingUrl: string;
  myPrice: number;
  netProfit?: number;
  targetGap?: number;
  suggestedPrice?: number;
};

export type CategoryAnalysisSuccessResponse = {
  ok: true;
  sourceType: ListingSourceType;
  normalizedUrl: string;
  stats: ListingPriceStats;
  pricesCount: number;
  summary: string;
};

export type CategoryAnalysisErrorResponse = {
  ok: false;
  message: string;
};

export type CategoryAnalysisResponse = CategoryAnalysisSuccessResponse | CategoryAnalysisErrorResponse;

export type ListingUrlValidationResult = {
  ok: boolean;
  reason?: string;
  normalizedUrl?: string;
  sourceType: ListingSourceType;
};

export type ListingSourceAdapter = {
  sourceType: Exclude<ListingSourceType, 'unknown'>;
  matches(url: URL): boolean;
  validate(rawUrl: string): ListingUrlValidationResult;
  normalize(urlOrRaw: string | URL): string;
};
