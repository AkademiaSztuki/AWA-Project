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

/**
 * Normalizes image orientation and returns base64 string without MIME header.
 * Uses canvas to ensure EXIF orientation is applied.
 */
export async function fileToNormalizedBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        
        // Modern browsers handle EXIF orientation automatically when drawing to canvas.
        canvas.width = img.width;
        canvas.height = img.height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, img.width, img.height);
        
        // Export as JPEG with good quality
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        const base64 = dataUrl.split(',')[1];
        resolve(base64);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Normalizes image orientation and returns full data URL string.
 */
export async function fileToNormalizedDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0, img.width, img.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
