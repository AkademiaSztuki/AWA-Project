import { describe, it, expect } from 'vitest';
import {
  mapNumericRatioToGoogleAspectRatio,
  parseGoogleAspectRatioLabel,
  normalizeDimensionsToMaxLongEdge,
} from './image-aspect';

describe('mapNumericRatioToGoogleAspectRatio', () => {
  it('maps exact 21:9', () => {
    expect(mapNumericRatioToGoogleAspectRatio(21 / 9)).toBe('21:9');
  });
  it('maps exact 16:9', () => {
    expect(mapNumericRatioToGoogleAspectRatio(16 / 9)).toBe('16:9');
  });
  it('maps exact 4:3', () => {
    expect(mapNumericRatioToGoogleAspectRatio(4 / 3)).toBe('4:3');
  });
  it('maps square', () => {
    expect(mapNumericRatioToGoogleAspectRatio(1)).toBe('1:1');
  });
  it('maps portrait 9:16', () => {
    expect(mapNumericRatioToGoogleAspectRatio(9 / 16)).toBe('9:16');
  });
  it('picks closest for borderline landscape (2.0 → 16:9)', () => {
    expect(mapNumericRatioToGoogleAspectRatio(2)).toBe('16:9');
  });
});

describe('parseGoogleAspectRatioLabel', () => {
  it('accepts valid labels', () => {
    expect(parseGoogleAspectRatioLabel('21:9')).toBe('21:9');
    expect(parseGoogleAspectRatioLabel(' 16:9 ')).toBe('16:9');
  });
  it('rejects unknown', () => {
    expect(parseGoogleAspectRatioLabel('32:9')).toBe(undefined);
    expect(parseGoogleAspectRatioLabel('')).toBe(undefined);
  });
});

describe('normalizeDimensionsToMaxLongEdge', () => {
  it('scales landscape to max long edge', () => {
    expect(normalizeDimensionsToMaxLongEdge(2100, 900, 1024)).toEqual({
      width: 1024,
      height: 439,
    });
  });
  it('scales portrait', () => {
    expect(normalizeDimensionsToMaxLongEdge(900, 1600, 1024)).toEqual({
      width: 576,
      height: 1024,
    });
  });
});
