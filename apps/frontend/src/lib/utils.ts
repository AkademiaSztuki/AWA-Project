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

// Full-resolution phone photos (12–50 MP) exceed the serverless request body limit (~4.5 MB)
// and can exhaust canvas memory on Android browsers.
const MAX_NORMALIZED_IMAGE_SIDE = 2048;
const NORMALIZED_JPEG_QUALITY = 0.9;

/**
 * Normalizes image orientation, downscales to MAX_NORMALIZED_IMAGE_SIDE and returns a JPEG data URL.
 * Uses canvas to ensure EXIF orientation is applied.
 */
export async function fileToNormalizedDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, MAX_NORMALIZED_IMAGE_SIDE / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));

        const canvas = document.createElement('canvas');
        // Modern browsers handle EXIF orientation automatically when drawing to canvas.
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', NORMALIZED_JPEG_QUALITY));
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Same as fileToNormalizedDataUrl, but returns base64 without the MIME header.
 */
export async function fileToNormalizedBase64(file: File): Promise<string> {
  const dataUrl = await fileToNormalizedDataUrl(file);
  return dataUrl.split(',')[1];
}
