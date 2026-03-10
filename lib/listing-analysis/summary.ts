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
    warning: 'Analiz sonucu yol göstericidir; kritik karar öncesi verileri kontrol edin.',
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
  return Boolean(input.usedRealAnalysis && !input.usedFallback);
}

function headlineByBand(bandLabel: string): string {
  if (bandLabel === 'Alt Bant') return 'Fiyatın pazarın alt bandında görünüyor.';
  if (bandLabel === 'Üst Bant') return 'Fiyatın pazarın üst bandında görünüyor.';
  return 'Fiyatın pazar ortalığına yakın görünüyor.';
}

function profitBullet(input: ListingAnalysisSummaryInput): string {
  if (typeof input.netProfit !== 'number') {
    return 'Bu tabloyu satış ve dönüşümle birlikte izlemek faydalı olur.';
  }
  if (input.netProfit < 0) {
    return 'Mevcut senaryoda net kâr negatif görünüyor.';
  }
  if (input.netProfit < Math.max(25, input.myPrice * 0.05)) {
    return 'Mevcut senaryoda net kâr pozitife yakın görünüyor.';
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
  if (delta >= 1) {
    return `Yaklaşık ${formatTry(input.suggestedPrice)} seviyesi daha güvenli olabilir.`;
  }
  if (delta <= -1) {
    return `Yaklaşık ${formatTry(input.suggestedPrice)} seviyesi daha dengeli olabilir.`;
  }
  if (input.bandLabel === 'Üst Bant') {
    return 'Küçük bir fiyat denemesi satış ihtimalini destekleyebilir.';
  }
  return 'Bu fiyatı küçük adımlarla test ederek ilerleyebilirsin.';
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

function normalizeSummary(summary: string): string {
  const lines = summary
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 4);

  return lines.join(' ');
}
