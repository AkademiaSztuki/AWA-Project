"use client";

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { AwaContainer } from '../awa/AwaContainer';
import { AwaDialogue } from '../awa/AwaDialogue';
import { useSessionData } from '@/hooks/useSessionData';
import { useModalAPI } from '@/hooks/useModalAPI';
import { stopAllDialogueAudio } from '@/hooks/useAudioManager';

const EXAMPLE_IMAGES = [
  { id: 1, src: '/images/examples/room1.jpg', name: 'Salon nowoczesny' },
  { id: 2, src: '/images/examples/room2.jpg', name: 'Sypialnia minimalistyczna' },
  { id: 3, src: '/images/examples/room3.jpg', name: 'Kuchnia skandynawska' },
];

const ROOM_TYPE_TRANSLATIONS: Record<string, string> = {
  'kitchen': 'Kuchnia',
  'bedroom': 'Sypialnia',
  'living_room': 'Salon',
  'bathroom': 'Łazienka',
  'dining_room': 'Jadalnia',
  'office': 'Biuro/Pracownia',
  'empty_room': 'Puste pomieszczenie'
};

export function PhotoUploadScreen() {
  const router = useRouter();
  const { updateSessionData, sessionData } = useSessionData();
  const { analyzeRoom } = useModalAPI();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectedRoomType, setDetectedRoomType] = useState<string | null>(null);
  const [roomAnalysis, setRoomAnalysis] = useState<any>(null);
  
  // Check URL params for skipFlow flag (Fast Track)
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const skipFlow = searchParams?.get('skipFlow') === 'true';

  const analyzeImage = useCallback(async (file: File) => {
    setIsAnalyzing(true);
    try {
      console.log('Starting room analysis for file:', file.name);
      
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data:image/...;base64, prefix
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      console.log('File converted to base64, calling analyzeRoom...');
      
      // Analyze room
      const analysis = await analyzeRoom({ image: base64 });
      
      console.log('Room analysis result:', analysis);
      
      setRoomAnalysis(analysis);
      setDetectedRoomType(analysis.detected_room_type);
      
      // Update session data
      updateSessionData({
        roomAnalysis: analysis,
        detectedRoomType: analysis.detected_room_type
      });
      
    } catch (error) {
      console.error('Error analyzing room:', error);
      // Fallback to default room type
      setDetectedRoomType('living_room');
    } finally {
      setIsAnalyzing(false);
    }
  }, [analyzeRoom, updateSessionData]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      console.log('File dropped:', file.name);
      setUploadedFile(file);
      setSelectedImage(URL.createObjectURL(file));
      // Automatically analyze the room
      analyzeImage(file);
    }
  }, [analyzeImage]);

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

  const handleRoomTypeConfirm = (roomType: string) => {
    setDetectedRoomType(roomType);
    updateSessionData({
      detectedRoomType: roomType
    });
  };

  const handleContinue = async () => {
    if (selectedImage && detectedRoomType) {
      stopAllDialogueAudio();
      
      // Save photo data
      await updateSessionData({
        uploadedImage: selectedImage,
        roomImage: selectedImage,
        roomType: detectedRoomType
      });
      
      // Check URL param first (most reliable), then sessionData
      const isFastTrack = skipFlow || (sessionData as any)?.pathType === 'fast';
      console.log('[PhotoUpload] Skip flow?', skipFlow);
      console.log('[PhotoUpload] Path type from session:', (sessionData as any)?.pathType);
      console.log('[PhotoUpload] Is Fast Track?', isFastTrack);
      
      if (isFastTrack) {
        // FAST TRACK: skip tinder/dna/ladder, go directly to generation
        console.log('[PhotoUpload] ⚡ FAST TRACK - Skipping to generation');
        
        // Set minimal data that generate page needs
        await updateSessionData({
          visualDNA: {
            dominantStyle: 'modern',
            dominantTags: [],
            preferences: { colors: [], materials: [], styles: [], lighting: [] },
            accuracyScore: 0
          },
          tinderResults: [],
          ladderPath: ['quick'],
          coreNeed: 'comfortable and functional interior'
        });
        
        router.push('/flow/generate');
      } else {
        // FULL EXPERIENCE: continue with complete flow
        console.log('[PhotoUpload] 🌟 FULL EXPERIENCE - Continuing to tinder');
        router.push('/flow/tinder');
      }
    }
  };

  return (
    <div className="min-h-screen flex w-full">
      {/* IDA model on the right side */}
      <AwaContainer 
        currentStep="upload" 
        showDialogue={false}
        fullWidth={false}
        autoHide={false}
      />

      <div className="flex-1 flex items-center justify-center p-8 lg:mr-32">
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
                      
                      {/* Room Analysis Results */}
                      {isAnalyzing && (
                        <div className="text-center py-4">
                          <div className="text-2xl mb-2">🔍</div>
                          <p className="text-sm text-gray-600">Analizuję pomieszczenie...</p>
                        </div>
                      )}
                      
                      {detectedRoomType && !isAnalyzing && (
                        <div className="bg-white/20 rounded-lg p-4 space-y-3">
                          <p className="text-sm font-medium text-gray-700">
                            IDA wykryła: <span className="font-bold text-gold">
                              {ROOM_TYPE_TRANSLATIONS[detectedRoomType]}
                            </span>
                          </p>
                          {roomAnalysis?.room_description && (
                            <p className="text-xs text-gray-600">
                              {roomAnalysis.room_description}
                            </p>
                          )}
                          
                          {/* Room Type Confirmation */}
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-gray-700">Czy to się zgadza?</p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleRoomTypeConfirm(detectedRoomType)}
                                className="flex-1 px-3 py-1 bg-green-500/20 text-green-700 text-xs rounded hover:bg-green-500/30 transition-colors"
                              >
                                Tak, to {ROOM_TYPE_TRANSLATIONS[detectedRoomType]}
                              </button>
                              <button
                                onClick={() => setDetectedRoomType(null)}
                                className="flex-1 px-3 py-1 bg-red-500/20 text-red-700 text-xs rounded hover:bg-red-500/30 transition-colors"
                              >
                                Nie, wybiorę ręcznie
                              </button>
                            </div>
                          </div>
                          
                          {/* Manual Room Type Selection */}
                          {!detectedRoomType && (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-gray-700">Wybierz typ pomieszczenia:</p>
                              <div className="grid grid-cols-2 gap-1">
                                {Object.entries(ROOM_TYPE_TRANSLATIONS).map(([key, label]) => (
                                  <button
                                    key={key}
                                    onClick={() => handleRoomTypeConfirm(key)}
                                    className="px-2 py-1 bg-white/30 text-gray-700 text-xs rounded hover:bg-gold/20 transition-colors"
                                  >
                                    {label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
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
                disabled={!selectedImage || !detectedRoomType || isAnalyzing}
              >
                {isAnalyzing ? 'Analizuję...' : 'Kontynuuj Test Wizualny →'}
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
        
        {/* Dynamiczny dialog dla analizy pokoju */}
        {detectedRoomType && roomAnalysis && (
          <div className="mt-4">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <div className="text-center">
                <div className="text-2xl mb-3">🎯</div>
                <p className="text-gray-800 font-medium mb-2">
                  Widzę, że to prawdopodobnie {ROOM_TYPE_TRANSLATIONS[detectedRoomType]}!
                </p>
                {roomAnalysis.room_description && (
                  <p className="text-sm text-gray-600 mb-3">
                    {roomAnalysis.room_description}
                  </p>
                )}
                <p className="text-xs text-gray-500">
                  Czy moja analiza jest trafna? Możesz to potwierdzić lub wybrać inny typ pomieszczenia.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}