const NBSP = '\u00A0';

/**
 * Binds short Polish function words to the following word (NBSP instead of normal space)
 * so they do not sit alone at the end of a line ("wiszące literki").
 *
 * Idempotent for typical UI copy (second pass leaves text unchanged).
 */
export function joinPolishOrphans(text: string): string {
  if (!text) return text;

  // Longer tokens first so e.g. "że" is not split as "z" + "e…".
  const shortToken =
    'że|ze|we|na|no|od|po|do|za|bo|co|to|ku|ju|ją|mu|mi|my|on|om|im|ż|w|i|o|u|z|a|ą|ę|ó|y';

  const re = new RegExp(`\\b(${shortToken})\\s+`, 'giu');

  return text.replace(re, (_, word: string) => `${word}${NBSP}`);
}
