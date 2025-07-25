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
    num_images: number;
  };
  processing_time: number;
  cost_estimate: number;
}

const POLLING_INTERVAL = 5000; // 5 seconds
const MAX_POLLING_ATTEMPTS = 180; // 180 attempts * 5s = 900s = 15 minutes

export const useModalAPI = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateImages = useCallback(async (request: GenerationRequest): Promise<GenerationResponse> => {
    setIsLoading(true);
    setError(null);

    const apiBase = process.env.NEXT_PUBLIC_MODAL_API_URL;
    if (!apiBase) {
      const msg = 'Brak konfiguracji ENDPOINTU generacji (NEXT_PUBLIC_MODAL_API_URL)';
      setError(msg);
      setIsLoading(false);
      throw new Error(msg);
    }
    
    try {
      console.log('Rozpoczynam generowanie z parametrami:', request);
      // Convert base_image from data URL to base64 if needed
      let base64Image = request.base_image;
      if (base64Image && base64Image.startsWith('data:image/')) {
        base64Image = base64Image.split(',')[1];
      }

      // 1. Start generation job
      const startResponse = await fetch(`${apiBase}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...request, base_image: base64Image }),
      });

      if (!startResponse.ok) {
        throw new Error(`Błąd serwera: ${startResponse.status}`);
      }

      const { call_id } = await startResponse.json();
      console.log(`Otrzymano call_id: ${call_id}. Rozpoczynam nasłuchiwanie...`);

      // Polling for the result
      for (let i = 0; i < MAX_POLLING_ATTEMPTS; i++) {
        await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL));

        const resultResponse = await fetch(`${apiBase}/result/${call_id}`);
        if (resultResponse.ok) {
          const result = await resultResponse.json();
          console.log(`[Poll ${i+1}/${MAX_POLLING_ATTEMPTS}] Status:`, result.status);

          if (result.status === 'complete') {
            console.log('Generowanie zakończone! Otrzymano wynik:', result);
            setIsLoading(false);
            return result.data; // Return the final data
          } else if (result.status === 'error') {
            console.error('Błąd w trakcie generowania po stronie backendu:', result.error);
            throw new Error(result.error || 'Wystąpił nieznany błąd w backendzie.');
          }
          // If status is 'pending', continue polling
        } else {
          // If polling request fails
          console.error(`Błąd podczas odpytywania o wynik (próba ${i + 1})`);
        }
      }

      setIsLoading(false);
      throw new Error('Przekroczono czas oczekiwania na wygenerowanie obrazu (15 minut).');

    } catch (err: any) {
      console.error('Wystąpił błąd w useModalAPI:', err);
      setError(err.message || 'Wystąpił nieznany błąd.');
      setIsLoading(false);
      throw err;
    }
  }, []);

  const checkHealth = async () => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_MODAL_API_URL;
      if (!apiBase) return false;
      const response = await fetch(`${apiBase}/health`);
      return response.ok;
    } catch {
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
