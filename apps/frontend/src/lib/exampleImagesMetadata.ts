// Pre-computed metadata for example images to avoid Gemma analysis delays

export interface ExampleImageMetadata {
  url: string;
  filename: string;
  roomType: string;
  confidence: number;
  roomDescription: string;
  comment: string;
  humanComment: string;
}

export const EXAMPLE_IMAGES_METADATA: ExampleImageMetadata[] = [
  {
    url: '/images/tinder/Living Room (1).jpg',
    filename: 'Living Room (1).jpg',
    roomType: 'living_room',
    confidence: 0.95,
    roomDescription: 'A modern living room with clean lines and natural materials',
    comment: 'Świetny salon! Widzę jasną przestrzeń z naturalnymi elementami.',
    humanComment: 'O, widzę że dzisiaj będziemy aranżować wspólnie ten przytulny salon! Widzę jasne ściany i duże okna - świetna baza do pracy.',
  },
  {
    url: '/images/tinder/Living Room (2).jpg',
    filename: 'Living Room (2).jpg',
    roomType: 'living_room',
    confidence: 0.95,
    roomDescription: 'Modern minimalist living room with neutral tones, natural wood furniture, and abundant greenery',
    comment: 'Świetny minimalistyczny salon! Widzę jasną przestrzeń z naturalnymi materiałami i roślinami.',
    humanComment: 'O, widzę ten spokojny, minimalistyczny salon! Jasne ściany, naturalne drewno i piękne rośliny tworzą przytulną atmosferę skandynawskiego stylu - świetna baza do pracy!',
  },
  {
    url: '/images/tinder/Living Room (3).jpg',
    filename: 'Living Room (3).jpg',
    roomType: 'living_room',
    confidence: 0.95,
    roomDescription: 'An elegant living room with sophisticated design elements',
    comment: 'Elegancki salon z wyrafinowanym stylem!',
    humanComment: 'O, widzę elegancką przestrzeń! To będzie fascynujący projekt - możemy podkreślić ten sophisticated charakter.',
  },
];

// Helper function to get metadata for example image
export function getExampleImageMetadata(imageUrl: string): ExampleImageMetadata | null {
  return EXAMPLE_IMAGES_METADATA.find(img => img.url === imageUrl) || null;
}

// Check if image is an example (pre-computed)
export function isExampleImage(imageUrl: string): boolean {
  return EXAMPLE_IMAGES_METADATA.some(img => img.url === imageUrl);
}

