import { NextResponse } from 'next/server';
import { detectListingSource } from '@/lib/listing-analysis/detect-source';
import { fetchListingHtml } from '@/lib/listing-analysis/fetch';
import { normalizeListingUrl } from '@/lib/listing-analysis/normalize-url';
import { buildListingPriceMetadata, extractListingPrices } from '@/lib/listing-analysis/parser';
import { buildListingSummary } from '@/lib/listing-analysis/route-helpers';
import { buildListingStats } from '@/lib/listing-analysis/stats';
import type {
  CategoryAnalysisRequestBody,
  CategoryAnalysisResponse,
  ListingAnalysisErrorCode
} from '@/lib/listing-analysis/types';
import { ListingAnalysisError } from '@/lib/listing-analysis/types';
import { validateListingUrl } from '@/lib/listing-analysis/validate-url';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<CategoryAnalysisRequestBody>;
    const listingUrl = typeof body.listingUrl === 'string' ? body.listingUrl.trim() : '';
    const myPrice = Number(body.myPrice);

    if (!listingUrl) {
      return NextResponse.json<CategoryAnalysisResponse>(
        { ok: false, message: 'Listing linki gerekli.' },
        { status: 400 }
      );
    }

    if (!Number.isFinite(myPrice) || myPrice <= 0) {
      return NextResponse.json<CategoryAnalysisResponse>(
        { ok: false, message: 'Satış fiyatı geçerli olmalı.' },
        { status: 400 }
      );
    }

    const validation = validateListingUrl(listingUrl);
    if (!validation.ok || !validation.normalizedUrl) {
      return NextResponse.json<CategoryAnalysisResponse>(
        { ok: false, message: validation.reason ?? 'Listing linki doğrulanamadı.' },
        { status: 400 }
      );
    }

    const normalizedUrl = normalizeListingUrl(validation.normalizedUrl);
    const sourceType = detectListingSource(normalizedUrl);
    const html = await fetchListingHtml(normalizedUrl);
    const prices = extractListingPrices(html, sourceType);
    const metadata = buildListingPriceMetadata(prices);
    const stats = buildListingStats(prices);
    const summary = await buildListingSummary({
      sourceType,
      normalizedUrl,
      stats,
      myPrice,
      pricesCount: metadata.pricesCount,
      usedRealAnalysis: true,
      usedFallback: false,
      netProfit: optionalNumber(body.netProfit),
      targetGap: optionalNumber(body.targetGap),
      suggestedPrice: optionalNumber(body.suggestedPrice)
    });

    return NextResponse.json<CategoryAnalysisResponse>({
      ok: true,
      sourceType,
      normalizedUrl,
      stats,
      pricesCount: prices.length,
      uniquePricesCount: metadata.uniquePricesCount,
      parseConfidence: metadata.parseConfidence,
      summary
    });
  } catch (error) {
    const normalized = normalizeCategoryAnalysisError(error);

    return NextResponse.json<CategoryAnalysisResponse>(
      {
        ok: false,
        message: normalized.message
      },
      { status: normalized.status }
    );
  }
}

function optionalNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeCategoryAnalysisError(error: unknown): { message: string; status: number } {
  const code: ListingAnalysisErrorCode =
    error instanceof ListingAnalysisError ? error.code : 'UNKNOWN';

  if (code === 'FETCH_TIMEOUT') {
    return { message: 'Sayfa zamanında yanıt vermedi.', status: 504 };
  }
  if (code === 'FETCH_FORBIDDEN' || code === 'FETCH_NOT_FOUND' || code === 'FETCH_NETWORK') {
    return { message: 'Listing sayfasına erişilemedi.', status: 502 };
  }
  if (code === 'FETCH_SERVER') {
    return { message: 'Listing sayfası şu anda yanıt veremiyor.', status: 502 };
  }
  if (code === 'FETCH_EMPTY_HTML' || code === 'EMPTY_HTML') {
    return { message: 'Sayfadan yeterli veri alınamadı.', status: 502 };
  }
  if (code === 'UNSUPPORTED_SOURCE') {
    return { message: 'Bu listing kaynağı henüz desteklenmiyor.', status: 400 };
  }
  if (code === 'INSUFFICIENT_PRICES' || code === 'LOW_CONFIDENCE_PARSE' || code === 'OUTLIER_COLLAPSE') {
    return { message: 'Bu listing sayfasından yeterli fiyat verisi alınamadı.', status: 422 };
  }

  return {
    message: 'Listing analizi sırasında beklenmeyen bir hata oluştu.',
    status: 500
  };
}
