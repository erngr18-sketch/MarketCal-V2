import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeFiniteNumber, sanitizePlainText } from '../lib/security/input-sanitize.ts';
import {
  sanitizeScenarioPayload,
  validateSaveQuota,
  validateScenarioTitle
} from '../lib/security/scenario-validation.ts';

test('sanitize title removes tags and trims whitespace', () => {
  const result = validateScenarioTitle('   <script>alert(1)</script>  Kâr   Senaryosu  ', 'profit_scenario');
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value, 'alert(1) Kâr Senaryosu');
  }
});

test('invalid number normalize clamps NaN and negatives safely', () => {
  assert.equal(normalizeFiniteNumber('NaN', { fallback: 0, min: 0 }), 0);
  assert.equal(normalizeFiniteNumber(-50, { fallback: 0, min: 0 }), 0);
  assert.equal(normalizeFiniteNumber(Infinity, { fallback: 7, min: 0 }), 7);
});

test('invalid plan limit is rejected at save quota layer', () => {
  const result = validateSaveQuota({
    trustedPlan: 'free',
    usedCount: 5,
    savedScenarioId: null
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.error, /5 kayıt/);
  }
});

test('malformed payload is rejected', () => {
  const result = sanitizeScenarioPayload({
    type: 'profit_scenario',
    title: 'Test',
    inputs: 'broken',
    result: {},
    aiSummary: null,
    trustedPlan: 'free',
    usedCount: 0
  });

  assert.equal(result.ok, false);
});

test('javascript category url is rejected', () => {
  const result = sanitizeScenarioPayload({
    type: 'market_analysis',
    title: 'Rekabet Analizi',
    inputs: {
      categoryUrl: 'javascript:alert(1)',
      mode: 'best_sellers',
      manualOpen: false,
      salesPrice: 100,
      costPrice: 50,
      commissionRate: 20,
      shippingCost: 10,
      advertisingCost: 10,
      targetProfit: 15
    },
    result: {
      marketBand: 'Orta Bant',
      netProfit: 5,
      targetGap: -10,
      summary: 'test',
      sourceType: 'simulation'
    },
    aiSummary: 'test',
    trustedPlan: 'free',
    usedCount: 0
  });

  assert.equal(result.ok, false);
});

test('overly long title is rejected', () => {
  const longTitle = 'a'.repeat(101);
  const result = validateScenarioTitle(longTitle, 'profit_scenario');
  assert.equal(result.ok, false);
});

test('save payload strips client supplied expiresAt and builds trusted expiry', () => {
  const result = sanitizeScenarioPayload({
    type: 'price_position',
    title: '  Fiyat   Konumu  ',
    inputs: {
      mode: 'best_sellers',
      salesPrice: 120,
      costPrice: 60,
      commissionRate: 20,
      shippingCost: 10,
      advertisingCost: 10,
      targetProfit: 15,
      productUrl: 'https://www.trendyol.com/marka/urun-adi-p-123456'
    },
    result: {
      band: 'Dengeli Konum',
      netProfit: 16,
      targetGap: 1,
      summary: 'Özet'
    },
    aiSummary: 'Kısa özet',
    createdAt: '2026-03-14T10:00:00.000Z',
    trustedPlan: 'free',
    usedCount: 0
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.payload.title, 'Fiyat Konumu');
    assert.equal(result.payload.expiresAt, '2026-04-13T10:00:00.000Z');
  }
});

test('sanitizePlainText normalizes control chars and whitespace', () => {
  const sanitized = sanitizePlainText('A\t\tB\n\nC\u0000', { fallback: '' });
  assert.equal(sanitized, 'A B C');
});
