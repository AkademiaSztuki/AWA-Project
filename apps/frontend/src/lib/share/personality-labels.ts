export type ShareLanguage = 'pl' | 'en';

type DomainKey = 'O' | 'C' | 'E' | 'A' | 'N';

const INTERIOR_LABELS: Record<DomainKey, { high: { pl: string; en: string }; low: { pl: string; en: string } }> = {
  O: {
    high: { pl: 'odważne formy', en: 'bold forms' },
    low: { pl: 'sprawdzone klasyki', en: 'familiar classics' },
  },
  C: {
    high: { pl: 'uporządkowane', en: 'composed order' },
    low: { pl: 'swobodny układ', en: 'easy layout' },
  },
  E: {
    high: { pl: 'towarzyskie', en: 'social spaces' },
    low: { pl: 'kameralne', en: 'intimate rooms' },
  },
  A: {
    high: { pl: 'łagodne', en: 'gentle mood' },
    low: { pl: 'wyraziste', en: 'graphic contrast' },
  },
  N: {
    high: { pl: 'uspokajające', en: 'calming' },
    low: { pl: 'dynamiczne', en: 'energetic' },
  },
};

function scoreForDomain(scores: Record<string, unknown> | null | undefined, key: DomainKey): number | null {
  if (!scores) return null;
  const domains = scores.domains as Record<string, unknown> | undefined;
  const fromDomain = domains?.[key];
  if (typeof fromDomain === 'number' && Number.isFinite(fromDomain)) return fromDomain;

  const aliases: Record<DomainKey, string> = {
    O: 'openness',
    C: 'conscientiousness',
    E: 'extraversion',
    A: 'agreeableness',
    N: 'neuroticism',
  };
  const fromAlias = scores[aliases[key]];
  if (typeof fromAlias === 'number' && Number.isFinite(fromAlias)) return fromAlias;
  return null;
}

export function personalityLabelsFromScores(
  scores: Record<string, unknown> | null | undefined,
  language: ShareLanguage,
): string[] {
  const keys: DomainKey[] = ['O', 'C', 'E', 'A', 'N'];
  const labels: string[] = [];
  for (const key of keys) {
    const score = scoreForDomain(scores, key);
    if (score == null) continue;
    if (score >= 60) {
      labels.push(INTERIOR_LABELS[key].high[language]);
    } else if (score <= 40) {
      labels.push(INTERIOR_LABELS[key].low[language]);
    }
  }
  return labels.slice(0, 5);
}
