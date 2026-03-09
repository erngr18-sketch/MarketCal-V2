export type CompareRowInput = {
  marketplaceId: string;
  salesPrice: number;
  vatRate: number;
  costPrice: number;
  commissionRate: number;
  shippingCost: number;
  advertisingCost: number;
  targetProfit: number;
  discountRate: number;
  couponValue: number;
};

export type CompareEngineInput = {
  rows: CompareRowInput[];
};

export type ProfitStatus = 'top' | 'on_target' | 'borderline' | 'loss';
export type RowStatus = Exclude<ProfitStatus, 'top'>;

export type CompareRowResult = {
  marketplaceId: string;
  effectivePrice: number;
  netSales: number;
  commissionAmount: number;
  netProfit: number;
  status: RowStatus;
  minRequiredSalesPrice: number;
  suggestedSalesPrice: number;
  alreadyAboveMinPrice: boolean;
};

export type AssistantItem = {
  marketplaceId: string;
  status: ProfitStatus;
  text: string;
};

export type CompareEngineOutput = {
  rows: CompareRowResult[];
  summary: {
    totalNetProfit: number;
    averageNetProfit: number;
    topMarketplaceId: string;
    bestMarketplaceId: string;
    worstMarketplaceId: string;
    topCount: number;
    onTargetCount: number;
    borderlineCount: number;
    lossCount: number;
    assistantItems: AssistantItem[];
    assistantMessage: string;
  };
};

export function calculateCompare(input: CompareEngineInput): CompareEngineOutput {
  const rows: CompareRowResult[] = input.rows.map((row) => {
    const discountRate = clamp(row.discountRate, 0, 100);
    const vatRate = clamp(row.vatRate, 0, 1);
    let couponValue = Math.max(0, row.couponValue);

    // XOR guard: if both are provided, ignore coupon.
    if (discountRate > 0 && couponValue > 0) {
      couponValue = 0;
    }

    const effectivePrice = Math.max(0, row.salesPrice - row.salesPrice * (discountRate / 100) - couponValue);
    const netSales = effectivePrice / (1 + vatRate);
    const commissionRate = clamp(row.commissionRate / 100, 0, 0.8);
    const commissionAmount = netSales * commissionRate;

    const netProfit = netSales - (row.costPrice + row.shippingCost + row.advertisingCost + commissionAmount);
    const status: RowStatus = netProfit < 0 ? 'loss' : netProfit >= row.targetProfit ? 'on_target' : 'borderline';

    const dr = discountRate / 100;
    const fixedCosts = row.costPrice + row.shippingCost + row.advertisingCost;
    const denominator = (1 - dr) * (1 - commissionRate);
    const minRequiredSalesPrice =
      denominator <= 0
        ? 0
        : round2((couponValue + ((row.targetProfit + fixedCosts) * (1 + vatRate)) / Math.max(0.0001, 1 - commissionRate)) / Math.max(0.0001, 1 - dr));
    const alreadyAboveMinPrice = row.salesPrice >= minRequiredSalesPrice;

    return {
      marketplaceId: row.marketplaceId,
      effectivePrice,
      netSales,
      commissionAmount,
      netProfit,
      status,
      minRequiredSalesPrice,
      suggestedSalesPrice: minRequiredSalesPrice,
      alreadyAboveMinPrice
    };
  });

  const totalNetProfit = rows.reduce((sum, row) => sum + row.netProfit, 0);
  const averageNetProfit = rows.length > 0 ? totalNetProfit / rows.length : 0;

  const bestRow = rows.reduce<CompareRowResult | null>((best, row) => {
    if (!best) return row;
    if (row.netProfit > best.netProfit) return row;
    if (row.netProfit < best.netProfit) return best;
    return row.marketplaceId.localeCompare(best.marketplaceId, 'tr') < 0 ? row : best;
  }, null);

  const worstRow = rows.reduce<CompareRowResult | null>((worst, row) => {
    if (!worst) return row;
    if (row.netProfit < worst.netProfit) return row;
    if (row.netProfit > worst.netProfit) return worst;
    return row.marketplaceId.localeCompare(worst.marketplaceId, 'tr') < 0 ? row : worst;
  }, null);

  const topMarketplaceId = bestRow?.marketplaceId ?? '';
  const assistantItems = rows.map((row, index) => buildAssistantItem(row, input.rows[index], topMarketplaceId));

  const topCount = topMarketplaceId ? 1 : 0;
  const onTargetCount = assistantItems.filter((item) => item.status === 'on_target').length;
  const borderlineCount = assistantItems.filter((item) => item.status === 'borderline').length;
  const lossCount = assistantItems.filter((item) => item.status === 'loss').length;

  const assistantMessage = [
    `Özet: ${topCount} En Karlı, ${onTargetCount} Hedefte, ${borderlineCount} Sınırda, ${lossCount} Zararda.`,
    ...assistantItems.map((item) => `${formatMarketplaceId(item.marketplaceId)} - ${item.text}`),
    'Kontrol: Komisyon oranı kategoriye göre değişebilir; panelden teyit edin.'
  ]
    .map((line) => `• ${line}`)
    .join('\n');

  return {
    rows,
    summary: {
      totalNetProfit,
      averageNetProfit,
      topMarketplaceId,
      bestMarketplaceId: topMarketplaceId,
      worstMarketplaceId: worstRow?.marketplaceId ?? '',
      topCount,
      onTargetCount,
      borderlineCount,
      lossCount,
      assistantItems,
      assistantMessage
    }
  };
}

function buildAssistantItem(row: CompareRowResult, input: CompareRowInput | undefined, topMarketplaceId: string): AssistantItem {
  if (!input) {
    return {
      marketplaceId: row.marketplaceId,
      status: row.status,
      text: 'Veriyi kontrol edip yeniden hesapla.'
    };
  }

  const status: ProfitStatus = row.marketplaceId === topMarketplaceId ? 'top' : row.status;
  const hasDiscount = input.discountRate > 0;
  const hasCoupon = input.couponValue > 0;
  const hasCampaignImpact = hasDiscount || hasCoupon;
  const hasCargo = input.shippingCost > 0;
  const hasAds = input.advertisingCost > 0;

  const campaignImpact = Math.max(0, input.salesPrice * (input.discountRate / 100), input.couponValue);
  const levers: Array<{ key: 'campaign' | 'cargo' | 'ads'; impact: number; text: string }> = [];

  if (hasCampaignImpact) {
    if (hasDiscount && hasCoupon) {
      levers.push({ key: 'campaign', impact: campaignImpact, text: 'İndirim ve kupon etkisini azaltarak marjı toparla.' });
    } else if (hasDiscount) {
      levers.push({ key: 'campaign', impact: campaignImpact, text: 'İndirim oranını azaltmayı test et.' });
    } else {
      levers.push({ key: 'campaign', impact: campaignImpact, text: 'Kupon tutarını azaltmayı test et.' });
    }
  }
  if (hasCargo) levers.push({ key: 'cargo', impact: input.shippingCost, text: 'Kargo maliyetini optimize et.' });
  if (hasAds) levers.push({ key: 'ads', impact: input.advertisingCost, text: 'Reklam bütçesini optimize et.' });

  // Priority: campaign impact first (if any), then highest remaining impact.
  levers.sort((a, b) => {
    if (a.key === 'campaign' && b.key !== 'campaign') return -1;
    if (b.key === 'campaign' && a.key !== 'campaign') return 1;
    if (a.impact !== b.impact) return b.impact - a.impact;
    return a.key.localeCompare(b.key, 'tr');
  });

  const selected = levers.slice(0, row.status === 'loss' ? 2 : 1).map((item) => item.text);

  if (status === 'top') {
    return {
      marketplaceId: row.marketplaceId,
      status,
      text: 'En karlı satır; bunu benchmark alarak diğerlerini bu seviyeye yaklaştır.'
    };
  }

  if (status === 'on_target') {
    const parts = ['Hedefte; marjı korumak için küçük adımlı testlerle ilerle.'];
    if (row.alreadyAboveMinPrice) parts.push('Mevcut satış fiyatın minimumun üzerinde.');
    return {
      marketplaceId: row.marketplaceId,
      status,
      text: parts.join(' ')
    };
  }

  const minPriceNote =
    row.minRequiredSalesPrice > input.salesPrice
      ? `Hedefe ulaşmak için minimum satış ${formatCurrency(row.minRequiredSalesPrice)}; mevcut fiyat bunun altında.`
      : '';

  const defaultAction = 'Satış fiyatı ve maliyet varsayımlarını birlikte gözden geçir.';

  return {
    marketplaceId: row.marketplaceId,
    status,
    text: [selected[0] ?? defaultAction, selected[1], minPriceNote].filter(Boolean).join(' ')
  };
}

function formatMarketplaceId(value: string) {
  if (typeof value !== 'string' || value.length === 0) return '-';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 2
  }).format(Number.isFinite(value) ? value : 0);
}
