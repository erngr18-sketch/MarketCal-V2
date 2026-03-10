export type ListingSourceType =
  | 'trendyol'
  | 'shopify'
  | 'ticimax'
  | 'ikas'
  | 'generic'
  | 'unknown';

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
