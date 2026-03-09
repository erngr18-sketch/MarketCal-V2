import { NextResponse } from 'next/server';
import { callGeminiCategoryAnalysis } from '@/lib/category-analysis/gemini';
import { fetchCategoryHtml } from '@/lib/category-analysis/fetch-html';
import { normalizeCategoryUrl } from '@/lib/category-analysis/normalize-url';
import { parseAndValidateRequestBody, validateCategoryAnalysisPayload } from '@/lib/category-analysis/schema';
import { trimHtml } from '@/lib/category-analysis/trim-html';
import type { ApiFailResponse, ApiSuccessResponse, CategoryAnalysisSuccessPayload, CategoryCluster, CategoryProduct, CategorySegmentRange } from '@/lib/category-analysis/types';

const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { ts: number; status: number; body: ApiSuccessResponse | ApiFailResponse }>();

export async function POST(request: Request) {
  const rawBody = await safeReadJson(request);
  const parsedBody = parseAndValidateRequestBody(rawBody);
  if (!parsedBody.ok) {
    return NextResponse.json<ApiFailResponse>(
      { ok: false, reason: parsedBody.reason },
      { status: 400 }
    );
  }

  const normalized = normalizeCategoryUrl(parsedBody.data.url, parsedBody.data.sortMode);
  if (!normalized.ok) {
    return NextResponse.json<ApiFailResponse>(
      { ok: false, reason: normalized.reason },
      { status: 400 }
    );
  }

  const cacheKey = `${normalized.normalizedUrl}|${parsedBody.data.sortMode}|${parsedBody.data.productLimit}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return NextResponse.json(cached.body, { status: cached.status });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[category-analysis] Missing GEMINI_API_KEY');
    return NextResponse.json<ApiFailResponse>(
      { ok: false, reason: 'Server configuration error: missing GEMINI_API_KEY', normalizedUrl: normalized.normalizedUrl },
      { status: 500 }
    );
  }

  const htmlResult = await fetchCategoryHtml(normalized.normalizedUrl);
  if (!htmlResult.ok) {
    return NextResponse.json<ApiFailResponse>(
      { ok: false, reason: htmlResult.reason, normalizedUrl: normalized.normalizedUrl },
      { status: 502 }
    );
  }

  const trimmedHtml = trimHtml(htmlResult.html);

  const gemini = await callGeminiCategoryAnalysis({
    apiKey,
    normalizedUrl: normalized.normalizedUrl,
    sortMode: parsedBody.data.sortMode,
    productLimit: parsedBody.data.productLimit,
    trimmedHtml
  });

  if (!gemini.ok) {
    return NextResponse.json<ApiFailResponse>(
      { ok: false, reason: gemini.reason, normalizedUrl: normalized.normalizedUrl },
      { status: 502 }
    );
  }

  if (!validateCategoryAnalysisPayload(gemini.payload)) {
    const body: ApiFailResponse = {
      ok: false,
      reason: 'AI response validation failed',
      needs: ['retry'],
      normalizedUrl: normalized.normalizedUrl
    };
    cache.set(cacheKey, { ts: Date.now(), status: 502, body });
    return NextResponse.json<ApiFailResponse>(body, { status: 502 });
  }

  if (!gemini.payload.ok) {
    const body: ApiFailResponse = {
      ok: false,
      reason: gemini.payload.reason,
      needs: gemini.payload.needs,
      normalizedUrl: normalized.normalizedUrl
    };
    cache.set(cacheKey, { ts: Date.now(), status: 502, body });
    return NextResponse.json<ApiFailResponse>(body, { status: 502 });
  }

  const extraction = gemini.payload as CategoryAnalysisSuccessPayload;
  const products = sanitizeProducts(extraction.products, parsedBody.data.productLimit);
  if (products.length === 0) {
    const body: ApiFailResponse = {
      ok: false,
      reason: 'No valid products extracted',
      normalizedUrl: normalized.normalizedUrl
    };
    cache.set(cacheKey, { ts: Date.now(), status: 502, body });
    return NextResponse.json<ApiFailResponse>(body, { status: 502 });
  }

  const statistics = computeStatistics(products);
  const clusters = computeClusters(products);
  const segments = computeSegments(products);
  const partial = products.length < parsedBody.data.productLimit;
  const summary = sanitizeSummary(extraction.summary);

  const success: ApiSuccessResponse = {
    ok: true,
    normalizedUrl: normalized.normalizedUrl,
    partial,
    reason: partial ? 'Eksik ürün verisi (partial extraction)' : undefined,
    data: {
      ok: true,
      source: {
        ...extraction.source,
        product_count: products.length
      },
      products,
      statistics,
      clusters,
      segments,
      summary
    }
  };

  cache.set(cacheKey, { ts: Date.now(), status: 200, body: success });
  return NextResponse.json<ApiSuccessResponse>(success, { status: 200 });
}

async function safeReadJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function sanitizeProducts(products: CategoryProduct[], limit: number): CategoryProduct[] {
  const rankSet = new Set<number>();
  const titlePriceSet = new Set<string>();

  return [...products]
    .sort((a, b) => a.rank - b.rank)
    .filter((item) => Number.isFinite(item.price_try) && item.price_try > 0)
    .filter((item) => {
      const titleKey = item.title.trim().toLowerCase();
      const titlePriceKey = `${titleKey}|${round2(item.price_try)}`;
      if (!titleKey) return false;
      if (!Number.isInteger(item.rank) || item.rank <= 0) return false;
      if (rankSet.has(item.rank)) return false;
      if (titlePriceSet.has(titlePriceKey)) return false;
      rankSet.add(item.rank);
      titlePriceSet.add(titlePriceKey);
      return true;
    })
    .slice(0, limit)
    .map((item, index) => ({
      rank: index + 1,
      title: item.title.trim(),
      price_try: round2(item.price_try)
    }));
}

function computeStatistics(products: CategoryProduct[]) {
  const prices = products.map((item) => item.price_try).sort((a, b) => a - b);
  if (prices.length === 0) {
    return { min_price: 0, average_price: 0, median_price: 0, max_price: 0 };
  }
  const min = prices[0];
  const max = prices[prices.length - 1];
  const average = prices.reduce((sum, value) => sum + value, 0) / prices.length;
  const median = percentile(prices, 50);
  return {
    min_price: round2(min),
    average_price: round2(average),
    median_price: round2(median),
    max_price: round2(max)
  };
}

function computeClusters(products: CategoryProduct[]): CategoryCluster[] {
  const prices = products.map((item) => item.price_try).sort((a, b) => a - b);
  if (prices.length === 0) {
    return [
      { name: 'low', min: 0, max: 0, count: 0 },
      { name: 'mid', min: 0, max: 0, count: 0 },
      { name: 'high', min: 0, max: 0, count: 0 }
    ];
  }

  const min = prices[0];
  const max = prices[prices.length - 1];
  const p33 = percentile(prices, 33);
  const p66 = percentile(prices, 66);

  const lowCount = prices.filter((price) => price <= p33).length;
  const midCount = prices.filter((price) => price > p33 && price <= p66).length;
  const highCount = prices.filter((price) => price > p66).length;

  return [
    { name: 'low', min: round2(min), max: round2(p33), count: lowCount },
    { name: 'mid', min: round2(p33), max: round2(p66), count: midCount },
    { name: 'high', min: round2(p66), max: round2(max), count: highCount }
  ];
}

function computeSegments(products: CategoryProduct[]) {
  const prices = products.map((item) => item.price_try).sort((a, b) => a - b);
  if (prices.length === 0) {
    return {
      economic: { min: 0, max: 0 },
      mid: { min: 0, max: 0 },
      premium: { min: 0, max: 0 },
      method: 'percentile' as const
    };
  }
  const min = prices[0];
  const max = prices[prices.length - 1];
  const median = percentile(prices, 50);
  const p80 = percentile(prices, 80);

  return {
    economic: asRange(min, median),
    mid: asRange(median, p80),
    premium: asRange(p80, max),
    method: 'percentile' as const
  };
}

function percentile(sortedPrices: number[], p: number): number {
  if (sortedPrices.length === 0) return 0;
  const pos = ((sortedPrices.length - 1) * p) / 100;
  const base = Math.floor(pos);
  const rest = pos - base;
  const next = sortedPrices[base + 1] ?? sortedPrices[base];
  return sortedPrices[base] + rest * (next - sortedPrices[base]);
}

function asRange(min: number, max: number): CategorySegmentRange {
  return { min: round2(min), max: round2(max) };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function sanitizeSummary(summary: CategoryAnalysisSuccessPayload['summary']) {
  return {
    summary_short_tr: summary.summary_short_tr?.trim() || 'Kategori analizi tamamlandı.',
    insights_tr: Array.isArray(summary.insights_tr) ? summary.insights_tr.filter((item) => typeof item === 'string' && item.trim().length > 0) : [],
    confidence_score: Number.isFinite(summary.confidence_score) ? clamp(summary.confidence_score, 0, 100) : 0
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
