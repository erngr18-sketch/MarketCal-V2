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
  const salesPrice = Math.max(0, input.salesPrice);
  const costPrice = Math.max(0, input.costPrice);
  const shippingCost = Math.max(0, input.shippingCost);
  const advertisingCost = Math.max(0, input.advertisingCost);
  const targetProfit = Math.max(0, input.targetProfit);
  const vatRate = Math.max(0, input.vatRate);
  const discountRate = clamp(input.discountRate ?? 0, 0, 100);
  const couponValue = Math.max(0, input.couponValue ?? 0);
  const commissionRate = clamp(input.commissionRate, 0, 100);

  const effectivePrice = round2(Math.max(0, salesPrice - salesPrice * (discountRate / 100) - couponValue));
  const netSales = round2(effectivePrice / (1 + vatRate / 100));
  const commissionAmount = round2(effectivePrice * (commissionRate / 100));
  const netProfit = round2(netSales - (costPrice + shippingCost + advertisingCost + commissionAmount));
  const targetGap = round2(netProfit - targetProfit);
  const marginPct = round2(netSales > 0 ? (netProfit / netSales) * 100 : 0);

  const commissionRateDecimal = commissionRate / 100;
  const vatRateDecimal = vatRate / 100;
  const denominator = 1 - commissionRateDecimal;
  const rawSuggestedSalesPrice =
    denominator <= 0
      ? effectivePrice
      : ((targetProfit + costPrice + shippingCost + advertisingCost) / denominator) * (1 + vatRateDecimal);
  const suggestedSalesPrice = round2(Number.isFinite(rawSuggestedSalesPrice) ? Math.max(0, rawSuggestedSalesPrice) : effectivePrice);

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

export function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}
