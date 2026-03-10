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
      throw new Error('Listing sayfası zamanında yanıt vermedi. Birkaç saniye sonra tekrar dene.');
    }
    throw new Error('Listing sayfası alınamadı. Linki kontrol edip tekrar dene.');
  }

  if (!response.ok) {
    throw new Error(`Listing sayfası alınamadı. Sunucu ${response.status} döndü.`);
  }

  const html = (await response.text()).trim();
  if (!html) {
    throw new Error('Listing sayfası boş döndü. Farklı bir link ile tekrar dene.');
  }

  return html;
}
