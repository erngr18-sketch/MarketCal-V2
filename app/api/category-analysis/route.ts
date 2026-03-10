import { NextResponse } from 'next/server';
import { detectListingSource } from '@/lib/listing-analysis/detect-source';
import { fetchListingHtml } from '@/lib/listing-analysis/fetch';
import { normalizeListingUrl } from '@/lib/listing-analysis/normalize-url';
import { extractListingPrices } from '@/lib/listing-analysis/parser';
import { buildListingSummary } from '@/lib/listing-analysis/route-helpers';
import { buildListingStats } from '@/lib/listing-analysis/stats';
import type {
  CategoryAnalysisRequestBody,
  CategoryAnalysisResponse,
  ListingPriceStats,
  ListingSourceType
} from '@/lib/listing-analysis/types';
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
    const stats = buildListingStats(prices);
    const summary = await buildListingSummary({
      sourceType,
      normalizedUrl,
      stats,
      myPrice,
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
      summary
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Listing analizi sırasında beklenmeyen bir hata oluştu.';

    return NextResponse.json<CategoryAnalysisResponse>(
      {
        ok: false,
        message
      },
      { status: 500 }
    );
  }
}

function optionalNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
