export type VatAwarePricingInput = {
  salesPrice: number;
  costPrice: number;
  commissionRate: number;
  shippingCost: number;
  advertisingCost: number;
  targetProfit: number;
  vatRate: number;
  discountRate?: number;
  couponValue?: number;
};

export type SanitizedPricingInput = {
  salesPrice: number;
  costPrice: number;
  commissionRate: number;
  shippingCost: number;
  advertisingCost: number;
  targetProfit: number;
  vatRate: number;
  discountRate: number;
  couponValue: number;
};

export type VatAwarePricingResult = {
  effectivePrice: number;
  netSales: number;
  commissionAmount: number;
  netProfit: number;
  targetGap: number;
  marginPct: number;
  suggestedSalesPrice: number;
};

export function calculateVatAwarePricing(input: VatAwarePricingInput): VatAwarePricingResult {
  const sanitized = sanitizePricingInput(input);
  const effectivePrice = calculateEffectivePrice(sanitized);
  const netSales = round2(Math.max(0, effectivePrice / (1 + sanitized.vatRate / 100)));
  const commissionAmount = round2(effectivePrice * (sanitized.commissionRate / 100));
  const netProfit = round2(netSales - (sanitized.costPrice + sanitized.shippingCost + sanitized.advertisingCost + commissionAmount));
  const targetGap = round2(netProfit - sanitized.targetProfit);
  const marginPct = round2(netSales > 0 ? (netProfit / netSales) * 100 : 0);
  const suggestedSalesPrice = calculateSuggestedPrice(sanitized, netProfit);

  return {
    effectivePrice,
    netSales,
    commissionAmount,
    netProfit,
    targetGap,
    marginPct,
    suggestedSalesPrice
  };
}

export function sanitizePricingInput(input: VatAwarePricingInput): SanitizedPricingInput {
  const salesPrice = sanitizeNonNegative(input.salesPrice);
  const costPrice = sanitizeNonNegative(input.costPrice);
  const shippingCost = sanitizeNonNegative(input.shippingCost);
  const advertisingCost = sanitizeNonNegative(input.advertisingCost);
  const targetProfit = sanitizeNonNegative(input.targetProfit);
  const vatRate = sanitizeNonNegative(input.vatRate);
  const commissionRate = clamp(sanitizeNonNegative(input.commissionRate), 0, 80);
  const campaign = resolveCampaignValues(input.discountRate, input.couponValue);

  return {
    salesPrice,
    costPrice,
    commissionRate,
    shippingCost,
    advertisingCost,
    targetProfit,
    vatRate,
    discountRate: campaign.discountRate,
    couponValue: campaign.couponValue
  };
}

export function resolveCampaignValues(discountRate?: number, couponValue?: number): { discountRate: number; couponValue: number } {
  const safeDiscountRate = clamp(sanitizeNonNegative(discountRate), 0, 100);
  const safeCouponValue = sanitizeNonNegative(couponValue);

  if (safeDiscountRate > 0) {
    return {
      discountRate: safeDiscountRate,
      couponValue: 0
    };
  }

  return {
    discountRate: 0,
    couponValue: safeCouponValue
  };
}

export function calculateEffectivePrice(input: SanitizedPricingInput): number {
  const discountedPrice = input.salesPrice * (1 - input.discountRate / 100);
  return round2(Math.max(0, discountedPrice - input.couponValue));
}

export function calculateSuggestedPrice(input: SanitizedPricingInput, currentNetProfit?: number): number {
  const currentProfit = Number.isFinite(currentNetProfit) ? Number(currentNetProfit) : 0;
  const fixedCosts = input.costPrice + input.shippingCost + input.advertisingCost;
  const discountMultiplier = 1 - input.discountRate / 100;
  const effectiveRevenueFactor = 1 / (1 + input.vatRate / 100) - input.commissionRate / 100;

  if (discountMultiplier <= 0 || effectiveRevenueFactor <= 0) {
    return round2(input.salesPrice);
  }

  const targetAdjustedRevenue = (input.targetProfit + fixedCosts) / effectiveRevenueFactor;
  const rawSuggestedSalesPrice = (targetAdjustedRevenue + input.couponValue) / discountMultiplier;

  if (!Number.isFinite(rawSuggestedSalesPrice) || rawSuggestedSalesPrice < 0) {
    return round2(input.salesPrice);
  }

  const safeSuggestedSalesPrice = round2(Math.max(0, rawSuggestedSalesPrice));

  if (currentProfit >= input.targetProfit) {
    return round2(Math.min(input.salesPrice, safeSuggestedSalesPrice));
  }

  return safeSuggestedSalesPrice;
}

export function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

function sanitizeNonNegative(value: number | undefined): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, parsed);
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}
