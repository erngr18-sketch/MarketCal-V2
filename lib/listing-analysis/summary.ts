import type { ListingAnalysisSummaryInput } from '@/lib/listing-analysis/types';
import { formatTry } from '@/lib/profit/competition-engine';

type ListingSummaryProvider = {
  generate(input: ListingAnalysisSummaryInput): Promise<string | null>;
};

export async function generateListingSummary(input: ListingAnalysisSummaryInput): Promise<string> {
  const provider = getListingSummaryProvider();
  const providerSummary = await provider.generate(input);

  if (providerSummary && providerSummary.trim().length > 0) {
    return normalizeSummary(providerSummary);
  }

  return buildFallbackSummary(input);
}

export function buildListingSummaryPrompt(input: ListingAnalysisSummaryInput): string {
  const compactPayload = JSON.stringify({
    sourceType: input.sourceType,
    normalizedUrl: input.normalizedUrl,
    stats: input.stats,
    myPrice: input.myPrice,
    bandLabel: input.bandLabel,
    segmentLabel: input.segmentLabel,
    netProfit: input.netProfit,
    targetGap: input.targetGap,
    suggestedPrice: input.suggestedPrice
  });

  return [
    'Sen e-ticaret fiyat karar desteği veren kısa bir assistantsın.',
    'Sana sadece küçük ve yapılandırılmış bir JSON verisi verilecek.',
    'Extraction yapma. HTML isteme. Yeni veri uydurma.',
    'Sadece verilen fiyat özeti üzerinden karar desteği ver.',
    'Cevap 2-4 kısa cümle olsun.',
    'Teknik terim kullanma.',
    '"median" kelimesini hiç kullanma.',
    'Alt Bant, Orta Seviye ve Üst Bant dilini kullan.',
    'Aksiyon odaklı ol ve gerekirse daha güvenli fiyat seviyesini söyle.',
    `Veri: ${compactPayload}`
  ].join('\n');
}

function getListingSummaryProvider(): ListingSummaryProvider {
  return {
    async generate(_input) {
      return null;
    }
  };
}

function buildFallbackSummary(input: ListingAnalysisSummaryInput): string {
  const sentences: string[] = [];
  const priceDeltaToMiddle = input.myPrice - input.stats.median;
  const middleAbsDelta = Math.abs(priceDeltaToMiddle);
  const middleRatio = input.stats.median > 0 ? middleAbsDelta / input.stats.median : 0;

  if (input.bandLabel === 'Alt Bant') {
    sentences.push('Fiyatın şu an Alt Bantta ve pazarda dikkat çekme ihtimali yüksek görünüyor.');
  } else if (input.bandLabel === 'Üst Bant') {
    sentences.push('Fiyatın şu an Üst Bantta; farkını anlatamazsan karar vermeyi zorlaştırabilir.');
  } else if (middleRatio <= 0.08) {
    sentences.push('Fiyatın pazarın orta seviyesine yakın görünüyor.');
  } else {
    sentences.push('Fiyatın şu an Orta Seviyede ve dengeli bir noktada duruyor.');
  }

  if (typeof input.netProfit === 'number' && typeof input.targetGap === 'number') {
    if (input.netProfit < 0) {
      sentences.push('Bu senaryoda karlilik negatif görünüyor; maliyet veya fiyat tarafında düzeltme gerekli.');
    } else if (input.targetGap < 0) {
      sentences.push('Mevcut senaryoda karlilik pozitif ama hedef karın altında kalıyor.');
    } else {
      sentences.push('Bu senaryoda karlilik pozitif ve hedef karı karşılıyor.');
    }
  } else if (input.segmentLabel === 'En Karlı' || input.segmentLabel === 'Hedefte') {
    sentences.push('Pazardaki konumun şu an güvenli bir aralıkta görünüyor.');
  } else {
    sentences.push('Kararı güçlendirmek için fiyatı biraz daha net konumlandırman faydalı olabilir.');
  }

  if (typeof input.suggestedPrice === 'number' && input.suggestedPrice > 0) {
    const suggestedDelta = input.suggestedPrice - input.myPrice;
    if (suggestedDelta >= 1) {
      sentences.push(`Yaklaşık ${formatTry(input.suggestedPrice)} seviyesi daha güvenli olabilir.`);
    } else if (suggestedDelta <= -1) {
      sentences.push(`Yaklaşık ${formatTry(input.suggestedPrice)} seviyesiyle daha rekabetçi kalabilirsin.`);
    } else if (input.bandLabel === 'Üst Bant') {
      sentences.push('Küçük bir fiyat düzenlemesi dönüşümü destekleyebilir.');
    } else {
      sentences.push('Mevcut fiyatı küçük testlerle koruyup sonucu izlemek mantıklı görünüyor.');
    }
  } else if (input.bandLabel === 'Üst Bant') {
    sentences.push('Daha rahat satış için fiyatı biraz aşağı çekmeyi test edebilirsin.');
  } else if (input.bandLabel === 'Alt Bant') {
    sentences.push('Talep güçlü kalırsa fiyatı küçük adımlarla yukarı test edebilirsin.');
  } else {
    sentences.push('Bu seviyeyi koruyup dönüşüm ve kar dengesini birlikte izlemek mantıklı olur.');
  }

  return normalizeSummary(sentences.slice(0, 3).join(' '));
}

function normalizeSummary(summary: string): string {
  const lines = summary
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 4);

  return lines.join(' ');
}
