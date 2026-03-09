export type MarketplaceKey = 'trendyol' | 'hepsiburada' | 'amazon' | 'n11' | 'ciceksepeti' | 'etsy' | 'temu';

export type MarketplaceRecord = {
  id: string;
  marketplace: MarketplaceKey;
  supplierId: string;
  apiKeyMasked: string;
  secretMasked: string;
  isActive: boolean;
  createdAt: string;
};

type SaveInput = {
  id?: string;
  marketplace: MarketplaceKey;
  supplierId: string;
  apiKey: string;
  secretKey: string;
};

let records: MarketplaceRecord[] = [];
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function subscribeMarketplaceStore(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getMarketplaceRecords() {
  return records;
}

export function saveMarketplaceRecord(input: SaveInput) {
  const now = new Date().toISOString();
  const next: MarketplaceRecord = {
    id: input.id ?? `mk_${Math.random().toString(36).slice(2, 10)}`,
    marketplace: input.marketplace,
    supplierId: input.supplierId,
    apiKeyMasked: maskApiKey(input.apiKey),
    secretMasked: '••••••',
    isActive: true,
    createdAt: now
  };

  const existingIndex = input.id ? records.findIndex((item) => item.id === input.id) : -1;
  if (existingIndex >= 0) {
    records = records.map((row, index) =>
      index === existingIndex ? { ...row, ...next, createdAt: row.createdAt } : row
    );
  } else {
    records = [next, ...records];
  }

  emit();
}

export function toggleMarketplaceActive(id: string) {
  let changed = false;
  records = records.map((row) => {
    if (row.id !== id) return row;
    changed = true;
    return { ...row, isActive: !row.isActive };
  });
  if (!changed) return;
  emit();
}

export function deleteMarketplaceRecord(id: string) {
  const next = records.filter((item) => item.id !== id);
  if (next.length === records.length) return;
  records = next;
  emit();
}

export function maskApiKey(apiKey: string) {
  const value = apiKey.trim();
  if (value.length <= 4) return '••••';
  return `${'•'.repeat(Math.max(4, value.length - 4))}${value.slice(-4)}`;
}
