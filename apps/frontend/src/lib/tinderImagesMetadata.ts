// Tinder Image Metadata for Core Profile Swipes
// Tags for behavioral analysis and pattern detection

export interface TinderImageMetadata {
  filename: string;
  style: 'modern' | 'traditional' | 'eclectic' | 'minimalist' | 'maximalist';
  colors: 'warm' | 'cool' | 'neutral';
  materials: string[];
  biophilia: number; // 0-3
  brightness: number; // 0-1
  complexity: number; // 0-1 (simple to complex)
}

// Currently using 3 Living Room images from /images/tinder/
// These will be repeated to create 30-image set
// TODO: Add more diverse images (different styles, rooms) for better pattern detection

export const CORE_PROFILE_TINDER_IMAGES: TinderImageMetadata[] = [
  {
    filename: 'Living Room (1).jpg',
    style: 'modern',
    colors: 'neutral',
    materials: ['fabric', 'wood', 'metal'],
    biophilia: 1,
    brightness: 0.7,
    complexity: 0.4
  },
  {
    filename: 'Living Room (2).jpg',
    style: 'modern',
    colors: 'neutral',
    materials: ['fabric', 'wood'],
    biophilia: 0,
    brightness: 0.6,
    complexity: 0.3
  },
  {
    filename: 'Living Room (3).jpg',
    style: 'traditional',
    colors: 'warm',
    materials: ['wood', 'fabric'],
    biophilia: 1,
    brightness: 0.5,
    complexity: 0.5
  }
];

/**
 * Get 30 images for Core Profile swipes by repeating existing images
 * In production, replace with 30 unique diverse images
 */
export function getCoreProfileSwipeImages(): Array<TinderImageMetadata & { id: number; url: string }> {
  const images: Array<TinderImageMetadata & { id: number; url: string }> = [];
  
  for (let i = 0; i < 30; i++) {
    const baseImage = CORE_PROFILE_TINDER_IMAGES[i % CORE_PROFILE_TINDER_IMAGES.length];
    images.push({
      ...baseImage,
      id: i + 1,
      url: `/images/tinder/${baseImage.filename}`
    });
  }
  
  return images;
}

/**
 * Analyze swipe patterns to extract aesthetic preferences
 */
export function analyzeSwipePatterns(swipes: Array<{ imageId: number; direction: 'left' | 'right' }>) {
  const images = getCoreProfileSwipeImages();
  const liked = swipes.filter(s => s.direction === 'right').map(s => images.find(img => img.id === s.imageId)!);
  
  // Count preferences
  const styleCount: Record<string, number> = {};
  const colorCount: Record<string, number> = {};
  const materialCount: Record<string, number> = {};
  let totalBiophilia = 0;
  let totalBrightness = 0;
  let totalComplexity = 0;
  
  liked.forEach(img => {
    if (!img) return;
    
    styleCount[img.style] = (styleCount[img.style] || 0) + 1;
    colorCount[img.colors] = (colorCount[img.colors] || 0) + 1;
    
    img.materials.forEach(m => {
      materialCount[m] = (materialCount[m] || 0) + 1;
    });
    
    totalBiophilia += img.biophilia;
    totalBrightness += img.brightness;
    totalComplexity += img.complexity;
  });
  
  const likedCount = liked.length || 1;
  
  return {
    dominantStyle: Object.entries(styleCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'modern',
    dominantColors: Object.entries(colorCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral',
    topMaterials: Object.entries(materialCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]),
    avgBiophilia: totalBiophilia / likedCount,
    avgBrightness: totalBrightness / likedCount,
    avgComplexity: totalComplexity / likedCount,
    likedPercentage: (likedCount / swipes.length) * 100
  };
}

