export type ListingSourceType =
  | 'trendyol'
  | 'shopify'
  | 'ticimax'
  | 'ikas'
  | 'generic'
  | 'unknown';

export type ListingAnalysisErrorCode =
  | 'EMPTY_HTML'
  | 'UNSUPPORTED_SOURCE'
  | 'INSUFFICIENT_PRICES'
  | 'LOW_CONFIDENCE_PARSE'
  | 'OUTLIER_COLLAPSE'
  | 'FETCH_TIMEOUT'
  | 'FETCH_FORBIDDEN'
  | 'FETCH_NOT_FOUND'
  | 'FETCH_SERVER'
  | 'FETCH_NETWORK'
  | 'FETCH_EMPTY_HTML'
  | 'UNKNOWN';

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

export type ListingPriceParseMetadata = {
  pricesCount: number;
  uniquePricesCount: number;
  rangeRatio: number;
  parseConfidence: SummaryConfidence;
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
  uniquePricesCount?: number;
  parseConfidence?: SummaryConfidence;
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

export class ListingAnalysisError extends Error {
  code: ListingAnalysisErrorCode;

  constructor(code: ListingAnalysisErrorCode, message: string) {
    super(message);
    this.name = 'ListingAnalysisError';
    this.code = code;
  }
}
