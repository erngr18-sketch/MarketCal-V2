import {
  buildDefaultScenarioTitle,
  buildScenarioSavePayload,
  getScenarioSavePolicy,
  scenarioTitleLabels,
  type SavedScenarioRecord,
  type ScenarioPlan,
  type ScenarioType
} from '../scenario-save.ts';
import { validateTrendyolUrl } from '../profit/competition-engine.ts';
import { normalizeFiniteNumber, sanitizeIsoDate, sanitizePlainText, sanitizeSummaryText } from './input-sanitize.ts';

export type ScenarioValidationResult =
  | { ok: true; payload: SavedScenarioRecord }
  | { ok: false; error: string };

const TITLE_MAX_LENGTH = 100;

export function validateScenarioType(value: unknown): value is ScenarioType {
  return typeof value === 'string' && value in scenarioTitleLabels;
}

export function validateScenarioTitle(value: unknown, type: ScenarioType) {
  const rawSanitized = sanitizePlainText(value, {
    fallback: '',
    maxLength: TITLE_MAX_LENGTH * 4,
    minLength: 0
  });

  if (rawSanitized.length > TITLE_MAX_LENGTH) {
    return { ok: false as const, error: `Başlık en fazla ${TITLE_MAX_LENGTH} karakter olabilir.` };
  }

  const normalized = rawSanitized || buildDefaultScenarioTitle(type);

  if (normalized.length < 3) {
    return { ok: false as const, error: 'Başlık en az 3 karakter olmalıdır.' };
  }

  return { ok: true as const, value: normalized };
}

export function validateSaveQuota({
  trustedPlan,
  usedCount,
  savedScenarioId
}: {
  trustedPlan: ScenarioPlan;
  usedCount: number;
  savedScenarioId?: string | null;
}) {
  const policy = getScenarioSavePolicy(trustedPlan);
  const safeUsedCount = Math.max(0, Math.floor(normalizeFiniteNumber(usedCount, { fallback: 0, min: 0, precision: null })));
  const isUpdate = Boolean(savedScenarioId);

  if (!isUpdate && safeUsedCount >= policy.maxSavedScenarios) {
    return {
      ok: false as const,
      error: `${capitalize(trustedPlan)} planda ${policy.maxSavedScenarios} kayıt saklanabilir.`
    };
  }

  return { ok: true as const };
}

export function sanitizeScenarioPayload({
  id,
  type,
  title,
  inputs,
  result,
  aiSummary,
  createdAt,
  trustedPlan,
  usedCount,
  savedScenarioId
}: {
  id?: string;
  type: unknown;
  title: unknown;
  inputs: unknown;
  result: unknown;
  aiSummary: unknown;
  createdAt?: unknown;
  trustedPlan: ScenarioPlan;
  usedCount: number;
  savedScenarioId?: string | null;
}): ScenarioValidationResult {
  if (!validateScenarioType(type)) {
    return { ok: false, error: 'Geçersiz senaryo tipi.' };
  }

  const quota = validateSaveQuota({ trustedPlan, usedCount, savedScenarioId });
  if (!quota.ok) return { ok: false, error: quota.error };

  const titleValidation = validateScenarioTitle(title, type);
  if (!titleValidation.ok) return { ok: false, error: titleValidation.error };

  const safeInputs = validateScenarioInputs(type, inputs);
  if (!safeInputs.ok) return { ok: false, error: safeInputs.error };

  const safeResult = validateScenarioResult(type, result);
  if (!safeResult.ok) return { ok: false, error: safeResult.error };

  return {
    ok: true,
    payload: buildScenarioSavePayload({
      id: typeof id === 'string' && id.trim().length > 0 ? id.trim() : undefined,
      type,
      title: titleValidation.value,
      inputs: safeInputs.value,
      result: safeResult.value,
      aiSummary: sanitizeSummaryText(aiSummary, 500),
      createdAt: sanitizeIsoDate(createdAt),
      plan: trustedPlan
    })
  };
}

export function validateScenarioInputs(type: ScenarioType, value: unknown) {
  if (!isRecord(value)) {
    return { ok: false as const, error: 'Kaydedilecek input verisi geçersiz.' };
  }

  if (type === 'profit_scenario') {
    return {
      ok: true as const,
      value: {
        salesPrice: money(value.salesPrice),
        costPrice: money(value.costPrice),
        commissionRate: rate(value.commissionRate, 80),
        shippingCost: money(value.shippingCost),
        advertisingCost: money(value.advertisingCost),
        targetProfit: money(value.targetProfit),
        vatRate: rate(value.vatRate, 100),
        campaignEnabled: Boolean(value.campaignEnabled),
        discountRate: rate(value.discountRate, 100),
        couponValue: money(value.couponValue)
      }
    };
  }

  if (type === 'marketplace_comparison') {
    const selected = Array.isArray(value.selectedMarketplaces)
      ? value.selectedMarketplaces.filter((item): item is string => typeof item === 'string').slice(0, 3)
      : [];
    const scenario = isRecord(value.scenario) ? value.scenario : {};
    const adjustments = Array.isArray(value.marketplaceAdjustments)
      ? value.marketplaceAdjustments
          .filter(isRecord)
          .slice(0, 3)
          .map((item) => ({
            marketplaceId: sanitizePlainText(item.marketplaceId, { fallback: '', maxLength: 40 }),
            commissionRate: rate(item.commissionRate, 80),
            shippingCost: money(item.shippingCost),
            advertisingCostOverride: money(item.advertisingCostOverride),
            campaignEnabled: Boolean(item.campaignEnabled),
            discountRate: rate(item.discountRate, 100),
            couponValue: money(item.couponValue)
          }))
      : [];

    return {
      ok: true as const,
      value: {
        selectedMarketplaces: selected,
        scenario: {
          salesPrice: money(scenario.salesPrice),
          costPrice: money(scenario.costPrice),
          targetProfit: money(scenario.targetProfit),
          defaultAdvertisingCost: money(scenario.defaultAdvertisingCost),
          vatRate: rate(scenario.vatRate, 100)
        },
        marketplaceAdjustments: adjustments
      }
    };
  }

  if (type === 'market_analysis') {
    const categoryUrl = nullableCategoryUrl(value.categoryUrl);
    if (typeof value.categoryUrl === 'string' && value.categoryUrl.trim() && !categoryUrl.ok) {
      return { ok: false as const, error: categoryUrl.error };
    }

    const manualPrices = isRecord(value.manualPrices) ? value.manualPrices : null;

    return {
      ok: true as const,
      value: {
        categoryUrl: categoryUrl.ok ? categoryUrl.value : null,
        mode: sanitizePlainText(value.mode, { fallback: 'best_sellers', maxLength: 40 }),
        manualOpen: Boolean(value.manualOpen),
        manualPrices: manualPrices
          ? {
              low: money(manualPrices.low),
              mid: money(manualPrices.mid),
              high: money(manualPrices.high)
            }
          : null,
        salesPrice: money(value.salesPrice),
        costPrice: money(value.costPrice),
        commissionRate: rate(value.commissionRate, 99.99),
        shippingCost: money(value.shippingCost),
        advertisingCost: money(value.advertisingCost),
        targetProfit: money(value.targetProfit)
      }
    };
  }

  const productUrl = validateProductUrl(value.productUrl);
  if (typeof value.productUrl === 'string' && value.productUrl.trim() && !productUrl.ok) {
    return { ok: false as const, error: productUrl.error };
  }

  return {
    ok: true as const,
    value: {
      mode: sanitizePlainText(value.mode, { fallback: 'best_sellers', maxLength: 40 }),
      salesPrice: money(value.salesPrice),
      costPrice: money(value.costPrice),
      commissionRate: rate(value.commissionRate, 99.99),
      shippingCost: money(value.shippingCost),
      advertisingCost: money(value.advertisingCost),
      targetProfit: money(value.targetProfit),
      productUrl: productUrl.ok ? productUrl.value : ''
    }
  };
}

export function validateScenarioResult(type: ScenarioType, value: unknown) {
  if (!isRecord(value)) {
    return { ok: false as const, error: 'Kaydedilecek sonuç verisi geçersiz.' };
  }

  if (type === 'profit_scenario') {
    return {
      ok: true as const,
      value: {
        netProfit: money(value.netProfit),
        targetGap: money(value.targetGap),
        marginPct: rate(value.marginPct, 100000),
        suggestedSalesPrice: money(value.suggestedSalesPrice),
        status: sanitizePlainText(value.status, { fallback: 'weak', maxLength: 20 })
      }
    };
  }

  if (type === 'marketplace_comparison') {
    return {
      ok: true as const,
      value: {
        topMarketplace: sanitizePlainText(value.topMarketplace, { fallback: '-', maxLength: 40 }),
        totalNetProfit: money(value.totalNetProfit),
        averageNetProfit: money(value.averageNetProfit),
        riskyMarketplaceCount: integer(value.riskyMarketplaceCount),
        assistantSummary: sanitizeSummaryText(value.assistantSummary, 500)
      }
    };
  }

  if (type === 'market_analysis') {
    return {
      ok: true as const,
      value: {
        marketBand: sanitizePlainText(value.marketBand, { fallback: '-', maxLength: 40 }),
        netProfit: money(value.netProfit),
        targetGap: money(value.targetGap),
        summary: sanitizeSummaryText(value.summary, 500),
        sourceType: sanitizePlainText(value.sourceType, { fallback: 'simulation', maxLength: 20 })
      }
    };
  }

  return {
    ok: true as const,
    value: {
      band: sanitizePlainText(value.band, { fallback: '-', maxLength: 40 }),
      netProfit: money(value.netProfit),
      targetGap: money(value.targetGap),
      summary: sanitizeSummaryText(value.summary, 500)
    }
  };
}

function nullableCategoryUrl(value: unknown) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return { ok: true as const, value: null };
  }

  const validation = validateTrendyolUrl(value);
  if (!validation.ok) {
    return { ok: false as const, error: validation.reason ?? 'Geçerli bir kategori linki girin.' };
  }

  return { ok: true as const, value: validation.normalizedUrl ?? value.trim() };
}

function validateProductUrl(value: unknown) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return { ok: true as const, value: '' };
  }

  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    return { ok: false as const, error: 'Geçerli bir ürün linki girin.' };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { ok: false as const, error: 'Ürün linki http veya https ile başlamalı.' };
  }

  const host = parsed.hostname.toLowerCase();
  if (host !== 'trendyol.com' && host !== 'www.trendyol.com') {
    return { ok: false as const, error: 'Şimdilik yalnızca Trendyol ürün linki kullanılabilir.' };
  }

  if (!parsed.pathname.toLowerCase().includes('-p-')) {
    return { ok: false as const, error: 'Geçerli bir ürün linki girin.' };
  }

  return { ok: true as const, value: parsed.toString() };
}

function money(value: unknown) {
  return normalizeFiniteNumber(value, {
    fallback: 0,
    min: 0,
    max: 1_000_000_000,
    precision: 2
  });
}

function rate(value: unknown, max: number) {
  return normalizeFiniteNumber(value, {
    fallback: 0,
    min: 0,
    max,
    precision: 2
  });
}

function integer(value: unknown) {
  return Math.floor(normalizeFiniteNumber(value, { fallback: 0, min: 0, max: 1_000_000, precision: null }));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
