import { describe, it, expect } from 'vitest';
import { resolveShareLanguage } from './resolve-language';

describe('resolveShareLanguage', () => {
  it('prefers explicit lang query param', () => {
    expect(
      resolveShareLanguage({
        searchParam: 'en',
        cardLanguage: 'pl',
        acceptLanguage: 'pl-PL',
      }),
    ).toBe('en');
  });

  it('falls back to card language', () => {
    expect(
      resolveShareLanguage({
        cardLanguage: 'en',
        acceptLanguage: 'pl-PL',
      }),
    ).toBe('en');
  });

  it('uses Accept-Language when no param or card language', () => {
    expect(resolveShareLanguage({ acceptLanguage: 'pl-PL,pl;q=0.9' })).toBe('pl');
    expect(resolveShareLanguage({ acceptLanguage: 'en-US,en;q=0.9' })).toBe('en');
  });

  it('defaults to English for international crawlers', () => {
    expect(resolveShareLanguage({})).toBe('en');
  });
});
