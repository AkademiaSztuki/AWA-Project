import { describe, expect, it } from 'vitest';
import { shareCardProxyPath } from './share-card-urls';

describe('shareCardProxyPath', () => {
  it('keeps the first load cacheable (no bust query)', () => {
    expect(shareCardProxyPath('abc', 'image')).toBe('/api/share/abc/image');
    expect(shareCardProxyPath('abc', 'before', 0)).toBe('/api/share/abc/before');
  });

  it('only cache-busts retries', () => {
    expect(shareCardProxyPath('abc', 'before', 1)).toBe('/api/share/abc/before?v=1');
  });

  it('encodes the slug', () => {
    expect(shareCardProxyPath('a/b', 'image')).toBe('/api/share/a%2Fb/image');
  });
});
