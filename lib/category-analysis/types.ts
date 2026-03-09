export const SORT_MODES = ['BEST_SELLER', 'MOST_RATED', 'MOST_FAVOURITE', 'MOST_RECENT'] as const;

export type CategorySortMode = (typeof SORT_MODES)[number];

export type CategoryAnalysisRequest = {
  url: string;
  sortMode: CategorySortMode;
  productLimit: number;
};

export type CategoryProduct = {
  rank: number;
  title: string;
  price_try: number;
};

export type CategoryCluster = {
  name: 'low' | 'mid' | 'high';
  min: number;
  max: number;
  count: number;
};

export type CategorySegmentRange = {
  min: number;
  max: number;
};

export type CategoryAnalysisSuccessPayload = {
  ok: true;
  source: {
    marketplace: 'trendyol';
    url: string;
    sort_mode: CategorySortMode;
    product_count: number;
  };
  products: CategoryProduct[];
  summary: {
    summary_short_tr: string;
    insights_tr: string[];
    confidence_score: number;
  };
};

export type CategoryAnalysisFailPayload = {
  ok: false;
  reason: string;
  needs: string[];
};

export type CategoryAnalysisPayload = CategoryAnalysisSuccessPayload | CategoryAnalysisFailPayload;

export type ApiSuccessResponse = {
  ok: true;
  normalizedUrl: string;
  partial: boolean;
  reason?: string;
  data: CategoryAnalysisPayload | {
    ok: true;
    source: {
      marketplace: 'trendyol';
      url: string;
      sort_mode: CategorySortMode;
      product_count: number;
    };
    products: CategoryProduct[];
    statistics: {
      min_price: number;
      average_price: number;
      median_price: number;
      max_price: number;
    };
    clusters: CategoryCluster[];
    segments: {
      economic: CategorySegmentRange;
      mid: CategorySegmentRange;
      premium: CategorySegmentRange;
      method: 'percentile';
    };
    summary: {
      summary_short_tr: string;
      insights_tr: string[];
      confidence_score: number;
    };
  };
};

export type ApiFailResponse = {
  ok: false;
  reason: string;
  needs?: string[];
  normalizedUrl?: string;
};
