import { describe, expect, it } from 'vitest';
import {
  calculateEffectivePrice,
  calculateSuggestedPrice,
  calculateVatAwarePricing,
  resolveCampaignValues,
  sanitizePricingInput
} from '../lib/profit/pricing-engine';

describe('pricing-engine', () => {
  describe('sanitizePricingInput', () => {
    it('clamps commission rate to 80 and normalizes invalid numbers', () => {
      const sanitized = sanitizePricingInput({
        salesPrice: Number.NaN,
        costPrice: -10,
        commissionRate: 120,
        shippingCost: -5,
        advertisingCost: Number.NaN,
        targetProfit: -1,
        vatRate: -20,
        discountRate: Number.NaN,
        couponValue: -100
      });

      expect(sanitized.salesPrice).toBe(0);
      expect(sanitized.costPrice).toBe(0);
      expect(sanitized.shippingCost).toBe(0);
      expect(sanitized.advertisingCost).toBe(0);
      expect(sanitized.targetProfit).toBe(0);
      expect(sanitized.vatRate).toBe(0);
      expect(sanitized.commissionRate).toBe(80);
      expect(sanitized.discountRate).toBe(0);
      expect(sanitized.couponValue).toBe(0);
    });
  });

  describe('resolveCampaignValues', () => {
    it('keeps discount active and ignores coupon when both are provided', () => {
      expect(resolveCampaignValues(15, 40)).toEqual({
        discountRate: 15,
        couponValue: 0
      });
    });

    it('supports coupon-only campaign', () => {
      expect(resolveCampaignValues(0, 25)).toEqual({
        discountRate: 0,
        couponValue: 25
      });
    });

    it('supports discount-only campaign', () => {
      expect(resolveCampaignValues(10, 0)).toEqual({
        discountRate: 10,
        couponValue: 0
      });
    });
  });

  describe('calculateEffectivePrice', () => {
    it('floors effective price at zero when coupon exceeds sales price', () => {
      const sanitized = sanitizePricingInput({
        salesPrice: 100,
        costPrice: 0,
        commissionRate: 10,
        shippingCost: 0,
        advertisingCost: 0,
        targetProfit: 0,
        vatRate: 20,
        couponValue: 150
      });

      expect(calculateEffectivePrice(sanitized)).toBe(0);
    });
  });

  describe('calculateVatAwarePricing', () => {
    it('keeps net sales non-negative and margin finite in edge cases', () => {
      const result = calculateVatAwarePricing({
        salesPrice: 0,
        costPrice: 50,
        commissionRate: 80,
        shippingCost: 10,
        advertisingCost: 5,
        targetProfit: 20,
        vatRate: 500,
        couponValue: 999
      });

      expect(result.effectivePrice).toBe(0);
      expect(result.netSales).toBe(0);
      expect(result.marginPct).toBe(0);
      expect(Number.isFinite(result.marginPct)).toBe(true);
      expect(Number.isFinite(result.netSales)).toBe(true);
    });

    it('returns safe suggested price values', () => {
      const stressed = calculateVatAwarePricing({
        salesPrice: 100,
        costPrice: 10,
        commissionRate: 80,
        shippingCost: 10,
        advertisingCost: 5,
        targetProfit: 20,
        vatRate: 900
      });

      expect(stressed.suggestedSalesPrice).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(stressed.suggestedSalesPrice)).toBe(true);
      expect(Number.isNaN(stressed.suggestedSalesPrice)).toBe(false);
    });

    it('does not suggest a higher price when target is already met', () => {
      const result = calculateVatAwarePricing({
        salesPrice: 240,
        costPrice: 80,
        commissionRate: 10,
        shippingCost: 10,
        advertisingCost: 5,
        targetProfit: 20,
        vatRate: 20
      });

      expect(result.netProfit).toBeGreaterThanOrEqual(20);
      expect(result.suggestedSalesPrice).toBeLessThanOrEqual(240);
    });

    it('returns sensible numeric values on a normal scenario', () => {
      const result = calculateVatAwarePricing({
        salesPrice: 120,
        costPrice: 60,
        commissionRate: 20,
        shippingCost: 10,
        advertisingCost: 10,
        targetProfit: 15,
        vatRate: 20
      });

      expect(result.effectivePrice).toBe(120);
      expect(result.netSales).toBeCloseTo(100, 2);
      expect(result.commissionAmount).toBeCloseTo(24, 2);
      expect(result.netProfit).toBeCloseTo(-4, 2);
      expect(Number.isFinite(result.netProfit)).toBe(true);
      expect(Number.isFinite(result.suggestedSalesPrice)).toBe(true);
    });
  });

  describe('calculateSuggestedPrice', () => {
    it('falls back safely when revenue factor becomes invalid', () => {
      const suggested = calculateSuggestedPrice(
        sanitizePricingInput({
          salesPrice: 135,
          costPrice: 50,
          commissionRate: 80,
          shippingCost: 5,
          advertisingCost: 5,
          targetProfit: 10,
          vatRate: 900
        })
      );

      expect(suggested).toBe(135);
      expect(Number.isFinite(suggested)).toBe(true);
    });
  });
});
