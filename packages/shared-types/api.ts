// API communication types
export interface FluxGenerationRequest {
  prompt: string;
  visualDNA: VisualDNA;
  baseImage?: string;
  style: InteriorStyle;
  modifications: ModificationType[];
  iterationType: 'micro' | 'macro';
  previousImages?: string[];
}

export interface FluxGenerationResponse {
  images: GeneratedImage[];
  prompt: string;
  parameters: FluxParameters;
  processingTime: number;
  cost: number;
  metadata: GenerationMetadata;
}

export interface GeneratedImage {
  id: string;
  url: string;
  base64?: string;
  thumbnailUrl?: string;
  prompt: string;
  parameters: FluxParameters;
}

export interface FluxParameters {
  model: 'flux-1-kontext';
  steps: number;
  guidance: number;
  strength?: number;
  seed: number;
  width: number;
  height: number;
}

export interface GenerationMetadata {
  sessionId: string;
  userId: string;
  timestamp: string;
  iterationNumber: number;
  parentImageId?: string;
}

export type InteriorStyle = 
  // Modern & Minimal
  | 'modern' | 'nowoczesny'
  | 'minimalist' | 'minimalistyczny'
  | 'contemporary' | 'współczesny'
  | 'transitional' | 'przejściowy'
  // Nordic & Zen
  | 'scandinavian' | 'skandynawski'
  | 'japanese' | 'japoński'
  | 'zen'
  // Industrial
  | 'industrial' | 'industrialny'
  // Classic & Traditional
  | 'traditional' | 'klasyczny'
  | 'mid-century'
  | 'art-deco' | 'artdeco'
  | 'vintage'
  // Bold & Eclectic
  | 'bohemian' | 'boho'
  | 'maximalist' | 'maksymalistyczny'
  | 'eclectic' | 'eklektyczny'
  | 'gothic' | 'gotycki'
  // Natural & Warm
  | 'rustic' | 'rustykalny'
  | 'farmhouse'
  | 'coastal' | 'nadmorski'
  | 'mediterranean' | 'śródziemnomorski'
  | 'tropical' | 'tropikalny';

export type ModificationType =
  | 'colors_warmer'
  | 'colors_cooler'
  | 'lighting_more'
  | 'lighting_softer'
  | 'materials_natural'
  | 'materials_modern'
  | 'plants_more'
  | 'textures_more'
  | 'furniture_rearrange'
  | 'space_larger'
  | 'windows_larger'
  | 'decorations_more';

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}