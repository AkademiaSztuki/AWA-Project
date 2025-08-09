"use client";

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { AwaContainer } from '../awa/AwaContainer';
import { AwaDialogue } from '../awa/AwaDialogue';
import { useSessionData } from '@/hooks/useSessionData';
import { stopAllDialogueAudio } from '@/hooks/useAudioManager';

const EXAMPLE_IMAGES = [
  { id: 1, src: '/images/examples/room1.jpg', name: 'Salon nowoczesny' },
  { id: 2, src: '/images/examples/room2.jpg', name: 'Sypialnia minimalistyczna' },
  { id: 3, src: '/images/examples/room3.jpg', name: 'Kuchnia skandynawska' },
];

export function PhotoUploadScreen() {
  const router = useRouter();
  const { updateSessionData } = useSessionData();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setUploadedFile(file);
      setSelectedImage(URL.createObjectURL(file));
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxFiles: 1
  });

  const handleExampleSelect = (imageSrc: string) => {
    setSelectedImage(imageSrc);
    setUploadedFile(null);
  };

  const handleContinue = () => {
    if (selectedImage) {
      stopAllDialogueAudio(); // Zatrzymaj dźwięk przed nawigacją
      updateSessionData({
        uploadedImage: selectedImage
      });
      router.push('/flow/tinder');
    }
  };

  return (
    <div className="min-h-screen flex flex-col w-full">
      

      <AwaContainer 
        currentStep="upload" 
        showDialogue={false}
        fullWidth={true}
        autoHide={false}
      />

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-3xl mx-auto">
          <GlassCard className="w-full">
            <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">
              Pokaż mi swoje wnętrze
            </h2>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Upload area */}
              <div>
                <h3 className="text-xl font-semibold mb-4">Wgraj swoje zdjęcie</h3>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                    isDragActive 
                      ? 'border-gold bg-gold/10' 
                      : 'border-gray-300 hover:border-gold/50'
                  }`}
                >
                  <input {...getInputProps()} />
                  {selectedImage && uploadedFile ? (
                    <div className="space-y-4">
                      <img 
                        src={selectedImage} 
                        alt="Uploaded" 
                        className="max-h-40 mx-auto rounded-lg"
                      />
                      <p className="text-sm text-gray-600">
                        {uploadedFile.name}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="text-4xl">📸</div>
                      <p className="text-lg">
                        {isDragActive 
                          ? 'Puść zdjęcie tutaj...' 
                          : 'Przeciągnij zdjęcie lub kliknij aby wybrać'
                        }
                      </p>
                      <p className="text-sm text-gray-500">
                        JPG, PNG, WEBP • Maksymalnie 10MB
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Example images */}
              <div>
                <h3 className="text-xl font-semibold mb-4">Lub wybierz przykład</h3>
                <div className="space-y-3">
                  {EXAMPLE_IMAGES.map((img) => (
                    <div
                      key={img.id}
                      onClick={() => handleExampleSelect(img.src)}
                      className={`border rounded-lg p-3 cursor-pointer transition-colors flex items-center space-x-3 ${
                        selectedImage === img.src && !uploadedFile
                          ? 'border-gold bg-gold/10'
                          : 'border-gray-200 hover:border-gold/50'
                      }`}
                    >
                      <img 
                        src={img.src} 
                        alt={img.name}
                        className="w-16 h-16 object-cover rounded"
                      />
                      <span className="font-medium">{img.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-center mt-8">
              <GlassButton 
                onClick={handleContinue}
                disabled={!selectedImage}
              >
                Kontynuuj Test Wizualny →
              </GlassButton>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Dialog IDA na dole - cała szerokość */}
      <div className="w-full">
        <AwaDialogue 
          currentStep="upload" 
          fullWidth={false}
          autoHide={false}
        />
      </div>
    </div>
  );
}