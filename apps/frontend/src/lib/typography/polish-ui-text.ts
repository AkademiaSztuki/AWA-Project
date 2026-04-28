/**
 * Polish UI typography: NBSP ties so short conjunctions/clitics are not stranded
 * at line breaks inside narrow cards (single-letter words, "nie …", reflexives).
 */

const NBSP = '\u00A0';

/** Single-letter Polish conjunctions / prepositions tied to the following word. */
const SINGLE_SHORT_WORD = /\b([aAiIuUwWoOzZ]) +/g;

/** "nie" + predicate (avoid breaking "nie" away from the verb/adjective). */
const NIE_WITH_NEXT = /\b([nN]ie) +/g;

/** Unstressed pronouns/clitics kept on the same line as the preceding word. */
const CLITIC_AFTER_WORD = /\s+(się|ciebie|tobie|mnie|mi|ci|mu|ją|go)\b/giu;

/**
 * Applies NBSP rules for Polish flow copy (questions, headings). English text is unchanged.
 */
export function formatPolishUiText(text: string): string {
  let s = text;
  s = s.replace(NIE_WITH_NEXT, `$1${NBSP}`);
  s = s.replace(SINGLE_SHORT_WORD, `$1${NBSP}`);
  s = s.replace(CLITIC_AFTER_WORD, `${NBSP}$1`);
  return s;
}
