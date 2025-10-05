import { useState, useCallback } from 'react';

interface GenerationRequest {
  prompt: string;
  base_image?: string;
  style: string;
  modifications: string[];
  strength: number;
  steps: number;
  guidance: number;
  num_images: number;
  image_size?: number;
}

interface GenerationResponse {
  images: string[];
  parameters: {
    prompt: string;
    steps: number;
    guidance: number;
    model: string;
    style: string;
    modifications: string[];
  };
  processing_time: number;
  cost_estimate: number;
}

interface RoomAnalysisRequest {
  image: string; // base64 encoded image
}

interface RoomAnalysisResponse {
  detected_room_type: string;
  confidence: number;
  room_description: string;
  suggestions: string[];
  comment: string; // Gemma 3 4B-PT generated comment
  human_comment?: string; // Human Polish comment from IDA
}

interface LLMCommentRequest {
  room_type: string;
  room_description: string;
  context?: string;
}

interface LLMCommentResponse {
  comment: string;
  suggestions: string[];
}

export const useModalAPI = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateImages = useCallback(async (request: GenerationRequest): Promise<GenerationResponse> => {
    setIsLoading(true);
    setError(null);

    const apiBase = process.env.NEXT_PUBLIC_MODAL_API_URL || 'https://akademiasztuki--aura-flux-api-fastapi-app.modal.run';
    if (!apiBase) {
      const msg = 'Brak konfiguracji ENDPOINTU generacji (NEXT_PUBLIC_MODAL_API_URL)';
      setError(msg);
      setIsLoading(false);
      throw new Error(msg);
    }
    
    try {
      console.log('Rozpoczynam generowanie z parametrami:', request);
      
      // Use base_image directly - it's already clean base64 without MIME header
      const base64Image = request.base_image;

      // Send generation request - now expecting synchronous response
      const response = await fetch(`${apiBase}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...request, base_image: base64Image }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error response:', errorText);
        throw new Error(`Błąd serwera: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Generowanie zakończone! Otrzymano wynik:', result);
      
      setIsLoading(false);
      return result;

    } catch (err: any) {
      console.error('Wystąpił błąd w useModalAPI:', err);
      setError(err.message || 'Wystąpił nieznany błąd.');
      setIsLoading(false);
      throw err;
    }
  }, []);

  const analyzeRoom = useCallback(async (request: RoomAnalysisRequest): Promise<RoomAnalysisResponse> => {
    setIsLoading(true);
    setError(null);

    const apiBase = process.env.NEXT_PUBLIC_MODAL_API_URL || 'https://akademiasztuki--aura-flux-api-fastapi-app.modal.run';
    if (!apiBase) {
      const msg = 'Brak konfiguracji ENDPOINTU analizy (NEXT_PUBLIC_MODAL_API_URL)';
      setError(msg);
      setIsLoading(false);
      throw new Error(msg);
    }
    
    try {
      console.log('Rozpoczynam analizę pokoju...');
      
      const response = await fetch(`${apiBase}/analyze-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Room analysis API error response:', errorText);
        throw new Error(`Błąd analizy pokoju: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Analiza pokoju zakończona! Otrzymano wynik:', result);
      
      setIsLoading(false);
      return result;

    } catch (err: any) {
      console.error('Wystąpił błąd w analizie pokoju:', err);
      setError(err.message || 'Wystąpił nieznany błąd podczas analizy pokoju.');
      setIsLoading(false);
      throw err;
    }
  }, []);

  const checkHealth = async () => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_MODAL_API_URL || 'https://akademiasztuki--aura-flux-api-fastapi-app.modal.run';
      if (!apiBase) {
        console.log('Brak NEXT_PUBLIC_MODAL_API_URL');
        return false;
      }
      
      console.log('Sprawdzam health endpoint:', `${apiBase}/health`);
      const response = await fetch(`${apiBase}/health`);
      console.log('Health check response:', response.status, response.ok);
      return response.ok;
    } catch (err) {
      console.error('Health check failed:', err);
      return false;
    }
  };

  const generateLLMComment = useCallback(async (roomType: string, roomDescription: string, context: string = 'room_analysis'): Promise<LLMCommentResponse> => {
    console.log('Generating LLM comment with Groq...');
    setIsLoading(true);
    setError(null);
    
    try {
      const apiBase = process.env.NEXT_PUBLIC_MODAL_API_URL || 'https://akademiasztuki--aura-flux-api-fastapi-app.modal.run';
      const response = await fetch(`${apiBase}/llm-comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          room_type: roomType,
          room_description: roomDescription,
          context: context
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('LLM comment result:', result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('LLM comment generation failed:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    generateImages,
    analyzeRoom,
    generateLLMComment,
    checkHealth,
    isLoading,
    error,
    setError,
  };
};
