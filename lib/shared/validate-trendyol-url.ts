export type UrlValidationResult =
  | { ok: true; normalizedUrl: string }
  | { ok: false; reason: string };

const ALLOWED_HOSTS = new Set(['trendyol.com', 'www.trendyol.com']);
const NOISE_PARAM_NAMES = new Set(['gclid', 'fbclid']);

export function validateTrendyolUrl(rawUrl: string): UrlValidationResult {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { ok: false, reason: 'Geçersiz Trendyol kategori/arama linki.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, reason: 'Geçersiz Trendyol kategori/arama linki.' };
  }

  if (!ALLOWED_HOSTS.has(parsed.hostname.toLowerCase())) {
    return { ok: false, reason: 'Geçersiz Trendyol kategori/arama linki.' };
  }

  const pathname = parsed.pathname.toLowerCase();
  if (pathname.includes('-p-')) {
    return { ok: false, reason: 'Geçersiz Trendyol kategori/arama linki.' };
  }

  const isSearchPath = pathname === '/sr' || pathname === '/sr/';
  const isCategoryPath = pathname.includes('-x-');
  if (!isSearchPath && !isCategoryPath) {
    return { ok: false, reason: 'Geçersiz Trendyol kategori/arama linki.' };
  }

  return {
    ok: true,
    normalizedUrl: normalizeTrendyolUrl(parsed)
  };
}

function normalizeTrendyolUrl(urlOrRaw: string | URL): string {
  const parsed = typeof urlOrRaw === 'string' ? new URL(urlOrRaw.trim()) : new URL(urlOrRaw.toString());
  const params = Array.from(parsed.searchParams.entries())
    .filter(([key]) => !key.toLowerCase().startsWith('utm_') && !NOISE_PARAM_NAMES.has(key.toLowerCase()))
    .sort(([a], [b]) => a.localeCompare(b, 'tr'));

  const normalizedParams = new URLSearchParams(params);
  const query = normalizedParams.toString();
  return `${parsed.protocol}//${parsed.hostname}${parsed.pathname}${query ? `?${query}` : ''}`;
}
