import type { DeterministicSummary, ListingAnalysisSummaryInput, SummaryConfidence } from '@/lib/listing-analysis/types';
import { formatTry } from '@/lib/profit/competition-engine';

type ListingSummaryProvider = {
  generate(input: ListingAnalysisSummaryInput): Promise<string | null>;
};

export async function generateListingSummary(input: ListingAnalysisSummaryInput): Promise<string> {
  const deterministicSummary = buildDeterministicSummary(input);
  const deterministicText = stringifyDeterministicSummary(deterministicSummary);

  if (!shouldUseAI(input)) {
    return deterministicText;
  }

  const provider = getListingSummaryProvider();
  const providerSummary = await provider.generate(input);

  if (providerSummary && providerSummary.trim().length > 0) {
    return normalizeSummary(providerSummary);
  }

  return deterministicText;
}

export function buildListingSummaryPrompt(input: ListingAnalysisSummaryInput): string {
  const deterministicSummary = buildDeterministicSummary(input);
  const compactPayload = JSON.stringify({
    sourceType: input.sourceType,
    normalizedUrl: input.normalizedUrl,
    stats: input.stats,
    myPrice: input.myPrice,
    bandLabel: input.bandLabel,
    segmentLabel: input.segmentLabel,
    netProfit: input.netProfit,
    targetGap: input.targetGap,
    suggestedPrice: input.suggestedPrice,
    pricesCount: input.pricesCount,
    usedRealAnalysis: input.usedRealAnalysis,
    usedFallback: input.usedFallback,
    deterministicSummary
  });

  return [
    'Sen e-ticaret fiyat karar desteği veren kısa bir assistantsın.',
    'Sana yalnızca küçük ve yapılandırılmış bir JSON verisi verilecek.',
    'HTML isteme, extraction yapma, yeni sayı üretme.',
    'Verilmeyen bilgi ekleme, hesap değiştirme, kesin hüküm verme.',
    'Deterministic summary gerçeğin ana kaynağıdır; sadece dili daha doğal hale getir.',
    'En fazla 2 kısa cümle yaz.',
    'Kısa ve sade Türkçe kullan.',
    '"median" kelimesini hiç kullanma.',
    'Alt Bant, Orta Seviye ve Üst Bant dilini koru.',
    `Veri: ${compactPayload}`
  ].join('\n');
}

export function buildDeterministicSummary(input: ListingAnalysisSummaryInput): DeterministicSummary {
  const bullets: string[] = [];

  bullets.push(profitBullet(input));
  bullets.push(targetBullet(input));

  const priceAction = suggestedPriceBullet(input);
  if (priceAction) {
    bullets.push(priceAction);
  }

  const confidence = confidenceFromInput(input);

  return {
    headline: headlineByBand(input.bandLabel),
    bullets: bullets.filter(Boolean).slice(0, 3),
    warning: 'Bu analiz yol göstericidir; karar vermeden önce verileri kontrol et.',
    confidence,
    confidenceLabel: confidenceLabel(confidence)
  };
}

export function stringifyDeterministicSummary(summary: DeterministicSummary): string {
  return normalizeSummary([summary.headline, ...summary.bullets].filter(Boolean).join(' '));
}

function getListingSummaryProvider(): ListingSummaryProvider {
  return {
    async generate(_input) {
      return null;
    }
  };
}

function shouldUseAI(input: ListingAnalysisSummaryInput): boolean {
  const hasRealAnalysis = Boolean(input.usedRealAnalysis && !input.usedFallback);
  if (!hasRealAnalysis) return false;

  const enoughCoverage = (input.pricesCount ?? 0) >= 12;
  const hasMeaningfulTension =
    (typeof input.netProfit === 'number' && input.netProfit < 0) ||
    (typeof input.targetGap === 'number' && input.targetGap < 0) ||
    hasMeaningfulPriceDelta(input);

  return enoughCoverage && hasMeaningfulTension;
}

function headlineByBand(bandLabel: string): string {
  if (bandLabel === 'Alt Bant') return 'Fiyatın pazarın alt bandına yakın görünüyor.';
  if (bandLabel === 'Üst Bant') return 'Fiyatın pazarın üst bandına yakın görünüyor.';
  return 'Fiyatın pazar ortalığına yakın görünüyor.';
}

function profitBullet(input: ListingAnalysisSummaryInput): string {
  if (typeof input.netProfit !== 'number') {
    return 'Bu tabloyu satış ve dönüşümle birlikte izlemek faydalı olur.';
  }
  if (input.netProfit < 0) {
    return 'Mevcut senaryoda net kâr negatif görünüyor.';
  }
  if (Math.abs(input.netProfit) < Math.max(15, input.myPrice * 0.03)) {
    return 'Mevcut senaryoda kârlılık oldukça sınırlı görünüyor.';
  }
  return 'Mevcut senaryoda net kâr pozitif görünüyor.';
}

function targetBullet(input: ListingAnalysisSummaryInput): string {
  if (typeof input.targetGap !== 'number') {
    return input.bandLabel === 'Üst Bant'
      ? 'Bu seviyede satış gerekçesini daha net göstermen gerekebilir.'
      : 'Mevcut seviyeyi kısa testlerle izlemek mantıklı olur.';
  }
  if (input.targetGap < 0) {
    return 'Hedef kârın altında kalıyorsun.';
  }
  return 'Hedef kârı karşılıyorsun.';
}

function suggestedPriceBullet(input: ListingAnalysisSummaryInput): string {
  if (typeof input.suggestedPrice !== 'number' || input.suggestedPrice <= 0) {
    return '';
  }

  const delta = input.suggestedPrice - input.myPrice;
  const meaningfulDelta = Math.max(10, input.myPrice * 0.03);

  if (delta >= meaningfulDelta) {
    return `Yaklaşık ${formatTry(input.suggestedPrice)} seviyesi daha güvenli olabilir.`;
  }
  if (delta <= -meaningfulDelta) {
    return 'Daha düşük bir fiyat seviyesi de kârlılığı koruyabilir.';
  }
  return '';
}

function confidenceFromInput(input: ListingAnalysisSummaryInput): SummaryConfidence {
  if (input.usedRealAnalysis && (input.pricesCount ?? 0) >= 12) {
    return 'high';
  }
  if (input.usedRealAnalysis && (input.pricesCount ?? 0) >= 6) {
    return 'medium';
  }
  return 'low';
}

function confidenceLabel(confidence: SummaryConfidence): string {
  if (confidence === 'high') return 'Yüksek güven';
  if (confidence === 'medium') return 'Orta güven';
  return 'Düşük güven';
}

function hasMeaningfulPriceDelta(input: ListingAnalysisSummaryInput): boolean {
  if (typeof input.suggestedPrice !== 'number' || input.suggestedPrice <= 0) {
    return false;
  }

  return Math.abs(input.suggestedPrice - input.myPrice) >= Math.max(10, input.myPrice * 0.03);
}

function normalizeSummary(summary: string): string {
  const lines = summary
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 4);

  return lines.join(' ');
}
