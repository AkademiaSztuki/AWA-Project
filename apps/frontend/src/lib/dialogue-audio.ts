/** True when any registered dialogue `<audio>` is actively playing. */
export function isDialogueAudioPlaying(): boolean {
  if (typeof document === 'undefined') return false;

  const audios = document.querySelectorAll('audio[data-type="dialogue"]');
  for (const node of audios) {
    const audio = node as HTMLAudioElement;
    if (!audio.paused && !audio.ended && audio.currentTime > 0) {
      return true;
    }
  }
  return false;
}
