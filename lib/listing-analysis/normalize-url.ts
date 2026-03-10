import { trendyolListingAdapter } from '@/lib/listing-analysis/adapters/trendyol';
import { detectListingSource } from '@/lib/listing-analysis/detect-source';

export function normalizeListingUrl(urlOrRaw: string | URL): string {
  const rawValue = typeof urlOrRaw === 'string' ? urlOrRaw : urlOrRaw.toString();
  const sourceType = detectListingSource(rawValue);

  if (sourceType === 'trendyol') {
    return trendyolListingAdapter.normalize(urlOrRaw);
  }

  const parsed = typeof urlOrRaw === 'string' ? new URL(urlOrRaw.trim()) : new URL(urlOrRaw.toString());
  return parsed.toString();
}
