import { describe, expect, it } from 'vitest';
import { couponInputSchema } from '@gofest/shared';
import { humanCode, normalizeEmail, safeCompare, sha256 } from '../../src/lib/crypto';

describe('crypto helpers', () => {
  it('creates human readable codes with the expected prefix', () => {
    const code = humanCode('GF', 10);
    expect(code).toMatch(/^GF-[A-Z2-9]{10}$/);
    expect(code).not.toBe(humanCode('GF', 10));
  });

  it('hashes deterministically', () => {
    expect(sha256('gofest')).toBe(
      '77004f9f603ca23d97afb9bb3c9d9b495f8202cca780f68f31bf619affc00184',
    );
  });

  it('compares strings safely', () => {
    expect(safeCompare('token', 'token')).toBe(true);
    expect(safeCompare('token', 'other')).toBe(false);
  });

  it('normalizes email addresses', () => {
    expect(normalizeEmail('  Buyer@Example.COM ')).toBe('buyer@example.com');
  });
});

describe('coupon schema', () => {
  it('rejects a percentage above 100', () => {
    const result = couponInputSchema.safeParse({
      code: 'PROMO',
      discountType: 'PERCENTAGE',
      discountValue: 120,
      minimumPurchase: 0,
      isActive: true,
    });
    expect(result.success).toBe(false);
  });

  it('accepts a valid fixed coupon', () => {
    const result = couponInputSchema.safeParse({
      code: 'hemat50',
      discountType: 'FIXED_AMOUNT',
      discountValue: 50000,
      minimumPurchase: 100000,
      isActive: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.code).toBe('HEMAT50');
    }
  });
});
