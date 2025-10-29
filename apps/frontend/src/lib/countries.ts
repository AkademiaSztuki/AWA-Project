"use client";

export type AppLanguage = 'pl' | 'en';

const FALLBACK_COUNTRY_CODES: string[] = [
  'PL','DE','FR','GB','ES','IT','NL','BE','SE','NO','DK','FI','PT','IE','AT','CH','CZ','SK','HU','LT','LV','EE','RO','BG','HR','SI','GR','UA','BY','RU',
  'US','CA','MX','BR','AR','CL','CO','PE','VE','UY','EC','BO','PY',
  'CN','JP','KR','IN','ID','TH','VN','MY','PH','SG','TW','HK',
  'AU','NZ','ZA','EG','MA','TN','NG','KE','ET','GH',
  'TR','IL','AE','SA','QA','KW','IR'
];

export function getAllCountryCodes(): string[] {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyIntl = Intl as any;
    if (typeof anyIntl.supportedValuesOf === 'function') {
      const regions: string[] = anyIntl.supportedValuesOf('region') as string[];
      return regions.filter((code) => /^[A-Z]{2}$/.test(code));
    }
  } catch {
    // ignore and use fallback
  }
  return FALLBACK_COUNTRY_CODES;
}

export function getCountryName(code: string, language: AppLanguage): string {
  try {
    const dn = new Intl.DisplayNames([language], { type: 'region' });
    const name = dn.of(code);
    return name || code;
  } catch {
    const fallbackNames: Record<string, { pl: string; en: string }> = {
      PL: { pl: 'Polska', en: 'Poland' },
      DE: { pl: 'Niemcy', en: 'Germany' },
      FR: { pl: 'Francja', en: 'France' },
      GB: { pl: 'Wielka Brytania', en: 'United Kingdom' },
      ES: { pl: 'Hiszpania', en: 'Spain' },
      IT: { pl: 'Włochy', en: 'Italy' },
      US: { pl: 'Stany Zjednoczone', en: 'United States' },
      CA: { pl: 'Kanada', en: 'Canada' },
      AU: { pl: 'Australia', en: 'Australia' },
      JP: { pl: 'Japonia', en: 'Japan' }
    };
    return (fallbackNames[code]?.[language] as string) || code;
  }
}

export function countryFlagEmoji(code: string): string {
  if (!code || code.length !== 2) return '';
  const base = 127397;
  const upper = code.toUpperCase();
  // Avoid downlevel iteration to support ES5 target
  const first = base + upper.charCodeAt(0);
  const second = base + upper.charCodeAt(1);
  return String.fromCodePoint(first, second);
}
