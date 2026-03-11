export const routes = {
  dashboard: '/dashboard',
  analyses: {
    root: '/analyses',
    profitScenario: '/analyses/profit-scenario',
    marketplaceComparison: '/analyses/marketplace-comparison',
    marketAnalysis: '/analyses/market-analysis',
    pricePosition: '/analyses/price-position'
  },
  products: '/products',
  settings: '/settings',
  login: '/login'
} as const;

export const routeLabels = {
  dashboard: 'Dashboard',
  analyses: 'Analizler',
  profitScenario: 'Kâr Senaryosu',
  marketplaceComparison: 'Pazaryeri Karşılaştırma',
  marketAnalysis: 'Rekabet Analizi',
  pricePosition: 'Fiyat Konumu',
  products: 'Ürünler',
  settings: 'Ayarlar'
} as const;
