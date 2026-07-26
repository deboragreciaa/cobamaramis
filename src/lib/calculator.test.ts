import { describe, it, expect } from 'vitest';
import { calculatePenawaran } from './calculator';
import { validateRateMultiple, staticRooms } from './rooms-data';

describe('PMK 144 Pricing Calculator - F2', () => {
  it('should compute total 22,943,700 for the mandatory test case', () => {
    // Test case: 318 sqm, Business purpose (100%), return rate 100%, risk factor 100%, 
    // 1 event day, 1 loading day, fair value 50,000, loading factor 30%, PPN 11%
    const input = {
      areaSqm: 318,
      purposeFactor: 1.00,
      returnRate: 1.00,
      riskFactor: 1.00,
      eventDays: 1,
      loadingDays: 1,
      fairValuePerSqm: 50000,
      loadingFactor: 0.30,
      ppnRate: 0.11,
    };

    const result = calculatePenawaran(input);

    expect(result.sewa).toBe(15900000);
    expect(result.ppnSewa).toBe(1749000);
    expect(result.loading).toBe(4770000);
    expect(result.ppnLoading).toBe(524700);
    expect(result.total).toBe(22943700);
  });
});

describe('Room Rate Multiple Verification', () => {
  it('should validate all initial seeded room daily rates are multiples of Rp111,000', () => {
    for (const room of staticRooms) {
      const isValid = validateRateMultiple(room.dailyRate);
      expect(isValid).toBe(true);
    }
  });

  it('should detect and fail rate validations that deviate from Rp111,000', () => {
    expect(validateRateMultiple(3219000)).toBe(true); // 3,219,000 / 111,000 = 29 (valid)
    expect(validateRateMultiple(1000000)).toBe(false); // not a multiple (invalid)
  });
});
