import type { ListingSourceType } from '@/lib/listing-analysis/types';

export function detectListingSource(rawUrl: string): ListingSourceType {
  const trimmed = rawUrl.trim();
  if (!trimmed) return 'unknown';

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return 'unknown';
  }

  const host = parsed.hostname.toLowerCase();
  const pathname = parsed.pathname.toLowerCase();

  if (host === 'trendyol.com' || host === 'www.trendyol.com') return 'trendyol';
  if (host.includes('myshopify.com') || pathname.includes('/collections/')) return 'shopify';
  if (host.includes('ticimax')) return 'ticimax';
  if (host.includes('ikas')) return 'ikas';
  if (host.length > 0 && (parsed.protocol === 'https:' || parsed.protocol === 'http:')) return 'generic';

  return 'unknown';
}
