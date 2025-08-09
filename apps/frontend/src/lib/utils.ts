export function cn(...inputs: Array<string | false | null | undefined>) {
  return inputs.filter(Boolean).join(' ');
}

export function generateUserHash(): string {
  return 'user_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function calculateReactionTime(startTime: number): number {
  return Date.now() - startTime;
}

export function analyzeVisualDNA(swipeData: any[]): any {
  // Implement visual DNA analysis logic
  const likedTags = swipeData
    .filter(swipe => swipe.direction === 'right')
    .flatMap(swipe => swipe.tags || []);

  const tagCounts = likedTags.reduce((acc: Record<string, number>, tag: string) => {
    acc[tag] = (acc[tag] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const dominantTags = Object.entries(tagCounts)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 5)
    .map(([tag]) => tag);

  return {
    dominantTags,
    preferences: {
      colors: dominantTags.filter(tag => ['jasny', 'ciemny', 'kolorowy'].includes(tag)),
      materials: dominantTags.filter(tag => ['drewno', 'metal', 'szkło'].includes(tag)),
      styles: dominantTags.filter(tag => ['minimalistyczny', 'rustykalny'].includes(tag)),
      lighting: dominantTags.filter(tag => ['naturalne', 'sztuczne'].includes(tag))
    },
    accuracyScore: Math.min(likedTags.length / 10, 1)
  };
}