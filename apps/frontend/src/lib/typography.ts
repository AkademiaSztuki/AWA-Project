export const NBSP = '\u00A0';

/** Short intros / marketing subtitles: left-aligned, pretty line breaks (no justify). */
export const BODY_TEXT_CLASS =
  'font-modern leading-relaxed text-pretty';

/** Long-form body copy: justified with automatic hyphenation (PL/EN via `lang`). */
export const BODY_TEXT_JUSTIFY_CLASS =
  'font-modern text-graphite leading-relaxed text-justify hyphens-auto [hyphenate-limit-chars:6_3_3]';

export const LIST_TEXT_JUSTIFY_CLASS = `min-w-0 flex-1 ${BODY_TEXT_JUSTIFY_CLASS}`;

/** Binds short PL/EN function words to the following word (safe to run twice). */
export function joinContentOrphans(text: string, lang: 'pl' | 'en'): string {
  if (!text) return text;
  const words =
    lang === 'pl'
      ? [
          'między',
          'przez',
          'przed',
          'czyli',
          'jeśli',
          'oraz',
          'albo',
          'przy',
          'pod',
          'nad',
          'bez',
          'dla',
          'więc',
          'lub',
          'czy',
          'jak',
          'gdy',
          'ani',
          'lecz',
          'nie',
          'od',
          'do',
          'na',
          'po',
          'za',
          'ze',
          'we',
          'ku',
          'że',
          'bo',
          'i',
          'a',
          'o',
          'w',
          'z',
          'u',
          'to',
        ]
      : [
          'through',
          'between',
          'before',
          'after',
          'under',
          'over',
          'from',
          'with',
          'for',
          'the',
          'and',
          'nor',
          'but',
          'yet',
          'so',
          'or',
          'an',
          'as',
          'if',
          'in',
          'on',
          'at',
          'to',
          'by',
          'of',
          'a',
        ];
  const sorted = [...words].sort((a, b) => b.length - a.length);
  const re = new RegExp(
    `\\b(${sorted.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\s+`,
    'giu',
  );
  return text.replace(re, (_, word: string) => `${word}${NBSP}`);
}
