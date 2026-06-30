export const SITE_NAME = 'IDA';
export const SITE_FULL_NAME = 'IDA Interior Design Assistant';

export const DEFAULT_DESCRIPTION =
  'Zaprojektuj wnętrze z AI dopasowane do Twojej osobowości i stylu życia. IDA łączy psychologię środowiskową, preferencje estetyczne i generatywną sztuczną inteligencję.';

export const DEFAULT_DESCRIPTION_EN =
  'Design your interior with AI tailored to your personality and lifestyle. IDA combines environmental psychology, aesthetic preferences, and generative artificial intelligence.';

export const DEFAULT_KEYWORDS = [
  'projektowanie wnętrz AI',
  'AI interior design',
  'personalizacja wnętrz',
  'generator wnętrz',
  'psychologia środowiskowa',
  'Big Five wnętrza',
  'IDA',
  'Interior Design Assistant',
];

const PRODUCTION_SITE_URL = 'https://www.project-ida.com';

/** Canonical site origin (no trailing slash). */
export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) return `https://${vercelUrl.replace(/\/$/, '')}`;

  return PRODUCTION_SITE_URL;
}

export function absoluteUrl(path: string): string {
  const base = getSiteUrl();
  if (!path || path === '/') return base;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
