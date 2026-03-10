import { trendyolListingAdapter } from '@/lib/listing-analysis/adapters/trendyol';
import { detectListingSource } from '@/lib/listing-analysis/detect-source';
import type { ListingSourceAdapter, ListingUrlValidationResult } from '@/lib/listing-analysis/types';

const adapters: ListingSourceAdapter[] = [trendyolListingAdapter];

export function validateListingUrl(rawUrl: string): ListingUrlValidationResult {
  const sourceType = detectListingSource(rawUrl);
  const adapter = adapters.find((item) => item.sourceType === sourceType);

  if (adapter) {
    return adapter.validate(rawUrl);
  }

  if (sourceType === 'unknown') {
    return {
      ok: false,
      reason: 'Link okunamadı. Trendyol kategori veya arama sonucu linki gir.',
      sourceType
    };
  }

  return {
    ok: false,
    reason: 'Şu an yalnızca Trendyol listing linkleri destekleniyor.',
    sourceType
  };
}
