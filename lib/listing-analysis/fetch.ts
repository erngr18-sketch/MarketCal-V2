import { ListingAnalysisError } from '@/lib/listing-analysis/types';

const DEFAULT_TIMEOUT_MS = 12000;
const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (compatible; MarketCalBot/1.0; +https://marketcal.local/category-analysis)';

export async function fetchListingHtml(url: string): Promise<string> {
  if (typeof window !== 'undefined') {
    throw new Error('fetchListingHtml yalnızca server-side kullanılabilir.');
  }

  let response: Response;

  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': DEFAULT_USER_AGENT
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS)
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      throw new ListingAnalysisError('FETCH_TIMEOUT', 'Sayfa zamanında yanıt vermedi.');
    }
    throw new ListingAnalysisError('FETCH_NETWORK', 'Listing sayfasına erişilemedi.');
  }

  if (!response.ok) {
    if (response.status === 403) {
      throw new ListingAnalysisError('FETCH_FORBIDDEN', 'Listing sayfasına erişim engellendi.');
    }
    if (response.status === 404) {
      throw new ListingAnalysisError('FETCH_NOT_FOUND', 'Listing sayfası bulunamadı.');
    }
    if (response.status >= 500) {
      throw new ListingAnalysisError('FETCH_SERVER', 'Listing sayfası şu anda yanıt veremiyor.');
    }
    throw new ListingAnalysisError('FETCH_NETWORK', 'Listing sayfasına erişilemedi.');
  }

  const html = (await response.text()).trim();
  if (!html) {
    throw new ListingAnalysisError('FETCH_EMPTY_HTML', 'Sayfadan yeterli veri alınamadı.');
  }

  return html;
}
