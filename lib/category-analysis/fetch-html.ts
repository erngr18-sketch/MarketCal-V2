const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36';

const FETCH_TIMEOUT_MS = 12_000;
const MAX_RAW_HTML_BYTES = 1_500_000;

type FetchHtmlResult =
  | { ok: true; html: string; status: number }
  | { ok: false; reason: string; status?: number };

export async function fetchCategoryHtml(url: string): Promise<FetchHtmlResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        'user-agent': USER_AGENT,
        accept: 'text/html,application/xhtml+xml',
        'accept-language': 'tr-TR,tr;q=0.9,en;q=0.8'
      },
      signal: controller.signal,
      cache: 'no-store'
    });
  } catch (error) {
    clearTimeout(timer);
    console.error('[category-analysis] HTML fetch failed:', error);
    return { ok: false, reason: 'html_fetch_failed' };
  }
  clearTimeout(timer);

  if (response.status === 403 || response.status === 429) {
    return { ok: false, reason: `blocked_or_rate_limited_${response.status}`, status: response.status };
  }

  if (!response.ok) {
    return { ok: false, reason: `html_fetch_status_${response.status}`, status: response.status };
  }

  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
  if (!contentType.includes('text/html')) {
    return { ok: false, reason: 'non_html_content_type', status: response.status };
  }

  const htmlText = await safeReadText(response);
  if (!htmlText) {
    return { ok: false, reason: 'empty_html_body', status: response.status };
  }

  const normalized = htmlText.length > MAX_RAW_HTML_BYTES ? htmlText.slice(0, MAX_RAW_HTML_BYTES) : htmlText;
  return { ok: true, html: normalized, status: response.status };
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

