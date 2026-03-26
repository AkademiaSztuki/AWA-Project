/**
 * Persist modify / fast-generate modification prompts to GCP `participants.modification_prompt_log` (JSONB).
 */

export type ModificationPromptLogEntry = {
  at: string;
  source: 'preset' | 'custom';
  presetId: string;
  category: 'micro' | 'macro';
  labelPl?: string;
  labelEn?: string;
  /** Free-text instruction when source === custom */
  userInstruction?: string;
  /** Full string sent to the image model */
  promptSent: string;
};

export function buildModificationPromptLogEntry(params: {
  modification: { id: string; label: { pl: string; en: string }; category: 'micro' | 'macro' };
  modificationPrompt: string;
  source: 'preset' | 'custom';
  userInstruction?: string;
}): ModificationPromptLogEntry {
  const { modification, modificationPrompt, source, userInstruction } = params;
  return {
    at: new Date().toISOString(),
    source,
    presetId: modification.id,
    category: modification.category,
    labelPl: modification.label.pl,
    labelEn: modification.label.en,
    userInstruction: userInstruction?.trim() || undefined,
    promptSent: modificationPrompt,
  };
}

export function appendModificationPromptLog(
  current: ModificationPromptLogEntry[] | undefined,
  entry: ModificationPromptLogEntry,
): ModificationPromptLogEntry[] {
  return [...(current ?? []), entry];
}
