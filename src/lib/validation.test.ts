import { describe, it, expect } from 'vitest';
import { validateBookingLock } from './validation';

describe('F5 Reservation Lock Validation', () => {
  it('should reject CONFIRMED booking when submission stage is less than 5', () => {
    expect(validateBookingLock('CONFIRMED', 1)).toBe(false);
    expect(validateBookingLock('CONFIRMED', 3)).toBe(false);
    expect(validateBookingLock('CONFIRMED', 4)).toBe(false);
  });

  it('should accept CONFIRMED booking when submission stage is 5 or greater', () => {
    expect(validateBookingLock('CONFIRMED', 5)).toBe(true);
    expect(validateBookingLock('CONFIRMED', 7)).toBe(true);
    expect(validateBookingLock('CONFIRMED', 9)).toBe(true);
  });

  it('should accept non-CONFIRMED bookings regardless of stage', () => {
    expect(validateBookingLock('TENTATIVE', 1)).toBe(true);
    expect(validateBookingLock('TENTATIVE', 3)).toBe(true);
    expect(validateBookingLock('UNAVAILABLE', 1)).toBe(true);
  });
});
