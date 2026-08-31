export type ShareLanguage = 'pl' | 'en';

export function parseShareLanguage(value: unknown): ShareLanguage | null {
  if (value === 'en' || value === 'pl') return value;
  return null;
}

/** Resolve share-card locale for crawlers (X, Facebook) and OG images. */
export function resolveShareLanguage(options: {
  searchParam?: string | null;
  cardLanguage?: string | null;
  acceptLanguage?: string | null;
}): ShareLanguage {
  const fromParam = parseShareLanguage(options.searchParam);
  if (fromParam) return fromParam;

  const fromCard = parseShareLanguage(options.cardLanguage);
  if (fromCard) return fromCard;

  const accept = options.acceptLanguage?.toLowerCase() ?? '';
  if (accept.startsWith('pl')) return 'pl';

  return 'en';
}
