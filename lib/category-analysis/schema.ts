import { SORT_MODES, type CategoryAnalysisPayload, type CategorySortMode } from '@/lib/category-analysis/types';

export function validateCategoryAnalysisPayload(payload: unknown): payload is CategoryAnalysisPayload {
  if (!isRecord(payload)) return false;
  if (typeof payload.ok !== 'boolean') return false;

  if (!payload.ok) {
    return typeof payload.reason === 'string' && Array.isArray(payload.needs) && payload.needs.every((item) => typeof item === 'string');
  }

  return (
    validateSource(payload.source) &&
    Array.isArray(payload.products) &&
    payload.products.every(validateProduct) &&
    validateSummary(payload.summary)
  );
}

export function parseAndValidateRequestBody(input: unknown):
  | { ok: true; data: { url: string; sortMode: CategorySortMode; productLimit: number } }
  | { ok: false; reason: string } {
  if (!isRecord(input)) return { ok: false, reason: 'Invalid JSON body' };

  const url = typeof input.url === 'string' ? input.url.trim() : '';
  if (!url) return { ok: false, reason: 'url is required' };

  const sortMode = typeof input.sortMode === 'string' ? input.sortMode.trim() : '';
  if (!SORT_MODES.includes(sortMode as CategorySortMode)) {
    return { ok: false, reason: 'sortMode is invalid' };
  }

  const rawLimit = typeof input.productLimit === 'number' ? input.productLimit : 20;
  const safeLimit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(50, Math.floor(rawLimit))) : 20;

  return {
    ok: true,
    data: {
      url,
      sortMode: sortMode as CategorySortMode,
      productLimit: safeLimit
    }
  };
}

function validateSource(source: unknown): boolean {
  if (!isRecord(source)) return false;
  return (
    source.marketplace === 'trendyol' &&
    typeof source.url === 'string' &&
    SORT_MODES.includes(source.sort_mode as CategorySortMode) &&
    typeof source.product_count === 'number' &&
    source.product_count > 0
  );
}

function validateProduct(product: unknown): boolean {
  if (!isRecord(product)) return false;
  const rank = product.rank;
  const title = product.title;
  const price = product.price_try;
  return (
    typeof rank === 'number' &&
    Number.isInteger(rank) &&
    rank > 0 &&
    typeof title === 'string' &&
    title.trim().length > 0 &&
    typeof price === 'number' &&
    Number.isFinite(price) &&
    price > 0
  );
}

function validateSummary(summary: unknown): boolean {
  if (!isRecord(summary)) return false;
  return (
    typeof summary.summary_short_tr === 'string' &&
    Array.isArray(summary.insights_tr) &&
    summary.insights_tr.every((item) => typeof item === 'string') &&
    typeof summary.confidence_score === 'number' &&
    summary.confidence_score >= 0 &&
    summary.confidence_score <= 100
  );
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
