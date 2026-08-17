import { describe, it, expect } from 'vitest';
import { personalityLabelsFromScores } from './personality-labels';

describe('personalityLabelsFromScores', () => {
  it('returns interior labels without raw scores', () => {
    const labels = personalityLabelsFromScores(
      { domains: { O: 80, C: 20, E: 50, A: 70, N: 30 } },
      'pl',
    );
    expect(labels).toContain('odważne formy');
    expect(labels).toContain('swobodny układ');
    expect(labels).toContain('łagodne');
    expect(labels).toContain('dynamiczne');
    expect(labels.join(' ')).not.toMatch(/\d/);
  });

  it('skips mid-range scores', () => {
    const labels = personalityLabelsFromScores(
      { openness: 50, conscientiousness: 50, extraversion: 50, agreeableness: 50, neuroticism: 50 },
      'en',
    );
    expect(labels).toEqual([]);
  });
});
