/**
 * Suno.com Music Generation Prompts
 * 
 * Prompty do generowania muzyki ambientowej/backgroundowej w Suno.com
 * dla każdego stylu muzycznego dostępnego w wizard profilu.
 * 
 * Zgodne z dokumentacją Suno.com:
 * - Simple Mode: krótkie opisy (2-3 zdania)
 * - Custom Mode: szczegółowe opisy z parametrami stylu
 */

export type MusicPreferenceId = 'jazz' | 'classical' | 'electronic' | 'rock' | 'funk' | 'pop';

/**
 * Prompty dla trybu Simple w Suno.com
 * Krótkie, zwięzłe opisy dla szybkiej generacji
 */
export const SUNO_SIMPLE_PROMPTS: Record<MusicPreferenceId, string> = {
  jazz: 'Smooth jazz instrumental ambient background music, sophisticated and relaxed, soft piano and saxophone melodies, cozy atmosphere',
  classical: 'Elegant classical instrumental ambient music, timeless and calm, soft orchestral strings and piano, peaceful atmosphere',
  electronic: 'Modern electronic ambient background music, energetic and focused, subtle synth melodies, contemporary atmosphere',
  rock: 'Rock instrumental, [Electric Guitar] [Drums], energetic, background',
  funk: 'Funk groove, instrumental, [Funky Bass] [Rhythm Guitar], vibrant, background',
  pop: 'Pop instrumental, [Piano] [Synthesizer], upbeat, background'
};

/**
 * Prompty dla trybu Custom w Suno.com
 * Bardziej szczegółowe opisy z dodatkowymi parametrami stylu
 */
export const SUNO_CUSTOM_PROMPTS: Record<MusicPreferenceId, string> = {
  jazz: 'Instrumental smooth jazz ambient track, sophisticated and relaxed atmosphere. Features soft piano melodies, gentle saxophone, subtle bass lines, and minimal percussion. Perfect for cozy, elegant interior spaces. No vocals, pure instrumental background music.',
  classical: 'Instrumental classical ambient piece, elegant and timeless. Features soft orchestral strings, gentle piano melodies, minimal arrangement, and calm atmospheric qualities. Perfect for sophisticated, peaceful interior spaces. No vocals, pure instrumental background music.',
  electronic: 'Instrumental electronic ambient track, modern and focused. Features subtle synth melodies, gentle electronic beats, atmospheric pads, and contemporary sound design. Energetic yet not overwhelming, perfect for modern interior spaces. No vocals, pure instrumental background music.',
  rock: 'Rock, instrumental, [Electric Guitar] [Rhythm Section], energetic, dynamic',
  funk: 'Funk, instrumental, [Groovy Bass] [Rhythm Guitar] [Soft Drums], vibrant, rhythmic',
  pop: 'Pop, instrumental, [Catchy Melody] [Soft Beat], upbeat, bright'
};


/**
 * Funkcja pomocnicza do pobierania promptu Suno dla danego stylu muzycznego
 * 
 * @param musicId - ID stylu muzycznego (jazz, classical, electronic, rock, funk, pop)
 * @param mode - Tryb Suno ('simple' | 'custom')
 * @returns Prompt do użycia w Suno.com
 */
export function getSunoPrompt(
  musicId: MusicPreferenceId,
  mode: 'simple' | 'custom' = 'simple'
): string {
  if (mode === 'simple') {
    return SUNO_SIMPLE_PROMPTS[musicId];
  }
  return SUNO_CUSTOM_PROMPTS[musicId];
}


/**
 * Eksport wszystkich promptów w jednym obiekcie
 */
export const SUNO_PROMPTS = {
  simple: SUNO_SIMPLE_PROMPTS,
  custom: SUNO_CUSTOM_PROMPTS,
  getPrompt: getSunoPrompt
};
