import { SORT_MODES, type CategorySortMode } from '@/lib/category-analysis/types';

const ALLOWED_HOSTS = new Set(['trendyol.com', 'www.trendyol.com']);

type NormalizeResult =
  | { ok: true; normalizedUrl: string }
  | { ok: false; reason: string };

export function normalizeCategoryUrl(rawUrl: string, sortMode: CategorySortMode): NormalizeResult {
  const trimmed = rawUrl.trim();
  if (!trimmed) return { ok: false, reason: 'URL alanı zorunludur.' };

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, reason: 'Geçersiz URL' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, reason: 'URL yalnızca http/https olabilir.' };
  }

  const host = parsed.hostname.toLowerCase();
  if (!ALLOWED_HOSTS.has(host)) {
    return { ok: false, reason: 'Sadece trendyol.com veya www.trendyol.com destekleniyor.' };
  }

  const pathname = parsed.pathname.toLowerCase();
  if (pathname.includes('-p-')) {
    return { ok: false, reason: 'Ürün linki geçersiz. Kategori/arama linki girin.' };
  }

  const isSearch = pathname === '/sr' || pathname === '/sr/';
  const isCategoryLike = pathname.includes('-x-');
  if (!isSearch && !isCategoryLike) {
    return { ok: false, reason: 'Kategori/arama sonucu linki girin.' };
  }

  if (!SORT_MODES.includes(sortMode)) {
    return { ok: false, reason: 'Geçersiz sortMode değeri.' };
  }

  parsed.searchParams.set('sst', sortMode);
  stripNoiseParams(parsed.searchParams);
  parsed.searchParams.sort();

  return {
    ok: true,
    normalizedUrl: parsed.toString()
  };
}

function stripNoiseParams(params: URLSearchParams) {
  const toDelete: string[] = [];
  params.forEach((_, key) => {
    const lower = key.toLowerCase();
    if (lower.startsWith('utm_') || lower === 'gclid' || lower === 'fbclid') {
      toDelete.push(key);
    }
  });

  toDelete.forEach((key) => params.delete(key));
}
