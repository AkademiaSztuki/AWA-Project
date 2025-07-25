'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useSession } from '@/hooks';
import GlassSurface from 'src/components/ui/GlassSurface';
import { GlassCard } from '@/components/ui/GlassCard';

// Helper function to convert file to base64
const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });

export default function PhotoUploadPage() {
  const router = useRouter();
  const { updateSession } = useSession();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Corrected paths for example images
  const exampleImages = [
    '/images/tinder/industrial_kitchen_1.jpg',
    '/images/tinder/modern_living_1.jpg',
    '/images/tinder/scandinavian_bedroom_1.jpg',
  ];

  const handleFileSelect = async (file: File) => {
    setIsLoading(true);
    try {
      const base64 = await toBase64(file);
      await updateSession({ roomImage: base64 });
      setSelectedImage(URL.createObjectURL(file));
    } catch (error) {
      console.error("Error converting file to base64", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExampleSelect = async (imageUrl: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const file = new File([blob], imageUrl.split('/').pop() || 'image.jpg', { type: blob.type });
      const base64 = await toBase64(file);
      await updateSession({ roomImage: base64 });
      setSelectedImage(imageUrl);
    } catch (error) {
      console.error("Error fetching or converting example image", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = () => {
    if (selectedImage) {
      router.push('/flow/tinder');
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center w-full">
      <GlassCard className="w-full p-6 md:p-8 bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl rounded-2xl max-h-[90vh] overflow-auto">
        <h1 className="text-2xl md:text-3xl font-exo2 font-bold text-gray-800 mb-3">Dodaj zdjęcie przestrzeni</h1>
        <p className="text-base md:text-lg text-gray-700 font-modern mb-3 leading-relaxed">
          Wgraj zdjęcie swojego pokoju lub wybierz przykładowe, aby AWA mogła lepiej zrozumieć Twój kontekst projektowy.
        </p>
        <div className="space-y-4 mb-4">
          <div>
            <h3 className="text-sm md:text-base font-bold text-gray-700 mb-1 font-exo2">Twoje zdjęcie</h3>
            <div className="flex flex-col items-center gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={e => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-gold-50 file:text-gold-700 hover:file:bg-gold-100"
                disabled={isLoading}
              />
              {selectedImage && (
                <Image src={selectedImage} alt="Wybrane zdjęcie" width={320} height={180} className="rounded-xl mt-2" />
              )}
            </div>
          </div>
          <div>
            <h3 className="text-sm md:text-base font-bold text-gray-700 mb-1 font-exo2">Przykładowe zdjęcia</h3>
            <div className="flex gap-3 justify-center flex-wrap">
              {exampleImages.map((img, idx) => (
                <button
                  key={img}
                  type="button"
                  onClick={() => handleExampleSelect(img)}
                  className={`border-2 ${selectedImage === img ? 'border-gold-500' : 'border-transparent'} rounded-xl transition-all disabled:opacity-50`}
                  disabled={isLoading}
                >
                  <Image src={img} alt={`Przykład ${idx + 1}`} width={96} height={64} className="rounded-xl" />
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-col md:flex-row gap-6 justify-center mt-6">
          <GlassSurface
            width={220}
            height={56}
            borderRadius={32}
            className="cursor-pointer select-none transition-transform duration-200 hover:scale-105 shadow-xl focus:outline-none focus:ring-2 focus:ring-gold-400 flex items-center justify-center text-base font-exo2 font-bold text-white rounded-2xl"
            onClick={() => router.push('/flow/onboarding')}
            aria-label="Powrót"
            style={{ opacity: 1 }}
          >
            ← Powrót
          </GlassSurface>
          <GlassSurface
            width={260}
            height={56}
            borderRadius={32}
            className={`cursor-pointer select-none transition-transform duration-200 hover:scale-105 shadow-xl focus:outline-none focus:ring-2 focus:ring-gold-400 flex items-center justify-center text-base md:text-base font-exo2 font-bold text-white rounded-2xl text-nowrap ${!selectedImage || isLoading ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
            onClick={handleContinue}
            aria-label="Dalej"
            style={{ opacity: 1 }}
          >
            {isLoading ? 'Przetwarzanie...' : 'Dalej →'}
          </GlassSurface>
        </div>
      </GlassCard>
    </div>
  );
}
