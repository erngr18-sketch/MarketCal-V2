import type { CategoryAnalysisPayload, CategorySortMode } from '@/lib/category-analysis/types';

type GeminiResult =
  | { ok: true; payload: unknown; rawText: string }
  | { ok: false; reason: string; status?: number };

export async function callGeminiCategoryAnalysis(params: {
  apiKey: string;
  normalizedUrl: string;
  sortMode: CategorySortMode;
  productLimit: number;
  trimmedHtml: string;
}): Promise<GeminiResult> {
  try {
    const model = process.env.GEMINI_MODEL ?? 'models/gemini-2.5-flash-lite';
    const endpoint = `https://generativelanguage.googleapis.com/v1/${model}:generateContent?key=${encodeURIComponent(params.apiKey)}`;
    const promptText = buildPrompt(params.normalizedUrl, params.sortMode, params.productLimit, params.trimmedHtml);
    const body = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: promptText
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        topP: 0.9,
        maxOutputTokens: 4096
      }
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const err = await safeReadText(response);
      console.error('[category-analysis] Gemini non-200', response.status, err);
      throw new Error(`Gemini API returned non-success status: ${response.status}`);
    }

    const responseJson = await safeReadJson(response);
    if (!responseJson) {
      return { ok: false, reason: 'Gemini response parse failed', status: 502 };
    }

    const rawText = extractModelText(responseJson);
    if (!rawText) {
      return { ok: false, reason: 'Gemini response text is empty', status: 502 };
    }

    const parsed = parseJsonFromText(rawText);
    if (!parsed.ok) {
      return { ok: false, reason: 'AI response JSON parse failed', status: 502 };
    }

    return { ok: true, payload: parsed.value, rawText };
  } catch (error) {
    console.error('[category-analysis] Gemini fetch failed:', error);
    return { ok: false, reason: 'Gemini fetch failed' };
  }
}

function buildPrompt(normalizedUrl: string, sortMode: CategorySortMode, productLimit: number, trimmedHtml: string): string {
  return [
    'You are a strict JSON generator.',
    'Analyze the provided Trendyol listing HTML and return ONLY JSON (no markdown, no explanation).',
    `marketplace: trendyol`,
    `normalizedUrl: ${normalizedUrl}`,
    `sortMode: ${sortMode}`,
    `productLimit: ${productLimit}`,
    '',
    'Use this HTML (trimmed):',
    trimmedHtml,
    '',
    'Return EXACTLY one of these two JSON shapes:',
    '{ "ok": true, "source": { "marketplace": "trendyol", "url": "...", "sort_mode": "BEST_SELLER", "product_count": 30 }, "products": [{ "rank": 1, "title": "...", "price_try": 0 }], "summary": { "summary_short_tr": "...", "insights_tr": ["...", "..."], "confidence_score": 0 } }',
    '{ "ok": false, "reason": "extraction_failed", "needs": ["html_retry_or_selector_fix"] }',
    'Rules:',
    '- JSON only.',
    '- summary_short_tr and insights_tr must be Turkish.',
    '- Try to fill products up to productLimit, minimum target 15 when productLimit is 20.',
    '- If you cannot confidently read a product price, DO NOT include that product.',
    '- Never output price_try as 0.',
    '- Never guess missing prices.',
    '- Do not invent placeholder prices.',
    '- Do not output products with missing or ambiguous prices.',
    '- price_try must be a positive number greater than 0.',
    '- If a price is missing, skip that product.',
    '- Products array must contain only products with non-empty title and price_try > 0.',
    '- If fewer than 10 valid products can be extracted, return {"ok": false, "reason": "extraction_failed", "needs": ["html_retry_or_selector_fix"]}.',
    '- Exclude sponsored/ad/promoted cards if identifiable.',
    '- Convert TRY price text to numeric price_try (e.g., 599.99).',
    '- price_try must be number.',
    '- confidence_score must be between 0 and 100.',
    '- No extra fields outside schema.'
  ].join('\n');
}

function extractModelText(responseJson: any): string | null {
  const text = responseJson?.candidates?.[0]?.content?.parts
    ?.map((part: any) => (typeof part?.text === 'string' ? part.text : ''))
    .join('')
    .trim();

  return text || null;
}

function parseJsonFromText(text: string): { ok: true; value: CategoryAnalysisPayload } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(text) as CategoryAnalysisPayload };
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return { ok: false };
    try {
      return { ok: true, value: JSON.parse(match[0]) as CategoryAnalysisPayload };
    } catch {
      return { ok: false };
    }
  }
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

async function safeReadJson(response: Response): Promise<any | null> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
