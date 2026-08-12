import { describe, it, expect } from 'vitest';
import { normalizeReferralCode } from './referral-storage';

describe('normalizeReferralCode', () => {
  it('accepts IDA codes', () => {
    expect(normalizeReferralCode(' ida-ab12cd ')).toBe('IDA-AB12CD');
  });

  it('rejects junk', () => {
    expect(normalizeReferralCode('hello')).toBe(null);
    expect(normalizeReferralCode('')).toBe(null);
    expect(normalizeReferralCode(null)).toBe(null);
  });
});
