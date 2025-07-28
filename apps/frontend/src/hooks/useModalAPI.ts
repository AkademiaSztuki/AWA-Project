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

export const useModalAPI = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateImages = useCallback(async (request: GenerationRequest): Promise<GenerationResponse> => {
    setIsLoading(true);
    setError(null);

    const apiBase = process.env.NEXT_PUBLIC_MODAL_API_URL || 'https://akademiasztuki--aura-flux-api-fastapi-app-dev.modal.run';
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

  const checkHealth = async () => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_MODAL_API_URL || 'https://akademiasztuki--aura-flux-api-fastapi-app-dev.modal.run';
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

  return {
    generateImages,
    checkHealth,
    isLoading,
    error,
    setError,
  };
};
