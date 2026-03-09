export type DetectedMarketplace =
  | 'trendyol'
  | 'hepsiburada'
  | 'amazon'
  | 'etsy'
  | 'zalando'
  | 'custom_store'
  | 'unknown';

export type DetectMarketplaceResult = {
  marketplace: DetectedMarketplace;
  label: string;
  supported: boolean;
};

export function detectMarketplace(rawUrl: string): DetectMarketplaceResult {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { marketplace: 'unknown', label: 'Kaynak algılanamadı', supported: false };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { marketplace: 'unknown', label: 'Kaynak algılanamadı', supported: false };
  }

  const host = parsed.hostname.toLowerCase();

  if (host === 'trendyol.com' || host === 'www.trendyol.com') {
    return { marketplace: 'trendyol', label: 'Trendyol', supported: true };
  }

  if (host === 'hepsiburada.com' || host === 'www.hepsiburada.com') {
    return { marketplace: 'hepsiburada', label: 'Hepsiburada', supported: false };
  }

  if (host.includes('amazon.')) {
    return { marketplace: 'amazon', label: 'Amazon', supported: false };
  }

  if (host === 'etsy.com' || host === 'www.etsy.com') {
    return { marketplace: 'etsy', label: 'Etsy', supported: false };
  }

  if (host.includes('zalando.')) {
    return { marketplace: 'zalando', label: 'Zalando', supported: false };
  }

  return { marketplace: 'custom_store', label: 'Özel Mağaza / Custom Store', supported: false };
}
