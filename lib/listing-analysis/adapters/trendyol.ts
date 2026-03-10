import type { ListingSourceAdapter, ListingUrlValidationResult } from '@/lib/listing-analysis/types';

const ALLOWED_HOSTS = new Set(['trendyol.com', 'www.trendyol.com']);
const NOISE_PARAM_NAMES = new Set(['gclid', 'fbclid']);

export const trendyolListingAdapter: ListingSourceAdapter = {
  sourceType: 'trendyol',
  matches(url) {
    return ALLOWED_HOSTS.has(url.hostname.toLowerCase());
  },
  validate(rawUrl) {
    const trimmed = rawUrl.trim();
    if (!trimmed) {
      return { ok: false, reason: 'Şu an yalnızca Trendyol listing linkleri destekleniyor.', sourceType: 'unknown' };
    }

    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      return { ok: false, reason: 'Link okunamadı. Trendyol kategori veya arama sonucu linki gir.', sourceType: 'unknown' };
    }

    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return { ok: false, reason: 'Link okunamadı. Trendyol kategori veya arama sonucu linki gir.', sourceType: 'trendyol' };
    }

    if (!ALLOWED_HOSTS.has(parsed.hostname.toLowerCase())) {
      return { ok: false, reason: 'Şu an yalnızca Trendyol listing linkleri destekleniyor.', sourceType: 'unknown' };
    }

    const pathname = parsed.pathname.toLowerCase();
    const full = parsed.toString().toLowerCase();

    if (pathname.includes('-p-') || full.includes('-p-')) {
      return { ok: false, reason: 'Ürün sayfası değil, kategori ya da arama sonucu linki gir.', sourceType: 'trendyol' };
    }

    const isSearchPath = pathname === '/sr' || pathname === '/sr/';
    const isKnownListingPath = pathname.startsWith('/butik/liste') || pathname.startsWith('/kategori');
    const isCategorySlugPath = /-x-c\d+/.test(pathname);
    const isListingPath = isSearchPath || isKnownListingPath || isCategorySlugPath;

    if (!isListingPath) {
      return { ok: false, reason: 'Link okunamadı. Trendyol kategori veya arama sonucu linki gir.', sourceType: 'trendyol' };
    }

    if (isSearchPath) {
      const hasSearchQuery = ['q', 'qt', 'st'].some((key) => {
        const value = parsed.searchParams.get(key);
        return typeof value === 'string' && value.trim().length > 0;
      });
      if (!hasSearchQuery) {
        return { ok: false, reason: 'Arama sonucu linki eksik veya hatalı görünüyor.', sourceType: 'trendyol' };
      }
    }

    return {
      ok: true,
      normalizedUrl: normalizeTrendyolListingUrl(parsed),
      sourceType: 'trendyol'
    };
  },
  normalize(urlOrRaw) {
    return normalizeTrendyolListingUrl(urlOrRaw);
  }
};

function normalizeTrendyolListingUrl(urlOrRaw: string | URL): string {
  const parsed = typeof urlOrRaw === 'string' ? new URL(urlOrRaw.trim()) : new URL(urlOrRaw.toString());
  const params = Array.from(parsed.searchParams.entries())
    .filter(([key]) => !key.toLowerCase().startsWith('utm_') && !NOISE_PARAM_NAMES.has(key.toLowerCase()))
    .sort(([a], [b]) => a.localeCompare(b, 'tr'));

  const normalizedParams = new URLSearchParams(params);
  const query = normalizedParams.toString();
  return `${parsed.protocol}//${parsed.hostname}${parsed.pathname}${query ? `?${query}` : ''}`;
}

export function validateTrendyolListingUrl(rawUrl: string): ListingUrlValidationResult {
  return trendyolListingAdapter.validate(rawUrl);
}

export function normalizeTrendyolListingUrlPublic(urlOrRaw: string | URL): string {
  return trendyolListingAdapter.normalize(urlOrRaw);
}
