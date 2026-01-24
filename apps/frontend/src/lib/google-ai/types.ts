// Google AI API Types

export interface InspirationAnalysisResponse {
  styles: string[];
  colors: string[];
  materials: string[];
  biophilia: number; // 0-3 scale
  description: string;
}

export interface ImageGenerationRequest {
  prompt: string;
  base_image?: string; // base64 encoded image for image-to-image
  style?: string;
  modifications?: string[];
  inspiration_images?: string[]; // Base64 images for multi-reference (InspirationReference source)
  width?: number;
  height?: number;
}

export interface ImageGenerationResponse {
  image: string; // base64 encoded image
  generation_info?: {
    model: string;
    prompt: string;
    width: number;
    height: number;
  };
}

export interface ImageUpscaleRequest {
  image: string; // base64 encoded image
  prompt: string;
  target_size?: number;
}

export interface ImageUpscaleResponse {
  image: string; // base64 encoded image
  generation_info?: {
    model: string;
    prompt: string;
    target_size: number;
  };
}

export interface RoomAnalysisResponse {
  detected_room_type: string;
  confidence: number;
  room_description: string;
  suggestions: string[];
  comment: string; // AI-generated comment
  comment_pl?: string;
  comment_en?: string;
  human_comment?: string; // Optional human-readable comment
}