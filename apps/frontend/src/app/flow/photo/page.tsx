'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useSession } from '@/hooks';
import { getOrCreateProjectId, saveDeviceContext, startPageView, endPageView } from '@/lib/supabase';
import GlassSurface from 'src/components/ui/GlassSurface';
import { GlassCard } from '@/components/ui/GlassCard';
import { AwaContainer, AwaDialogue } from '@/components/awa';
import { stopAllDialogueAudio } from '@/hooks/useAudioManager';
import { useModalAPI } from '@/hooks/useModalAPI';

// Helper function to convert file to base64
const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Extract only the base64 part without the MIME header
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });

export default function PhotoUploadPage() {
  const router = useRouter();
  const { sessionData, updateSession } = useSession();
  const { analyzeRoom, generateLLMComment } = useModalAPI();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [roomType, setRoomType] = useState<string>('living room');
  const [detectedRoomType, setDetectedRoomType] = useState<string | null>(null);
  const [showRoomTypeSelection, setShowRoomTypeSelection] = useState(false);
  const [roomAnalysis, setRoomAnalysis] = useState<any>(null);
  const [llmComment, setLlmComment] = useState<{ comment: string; suggestions: string[]; } | null>(null);
  const [humanComment, setHumanComment] = useState<string | null>(null);
  const [isGeneratingComment, setIsGeneratingComment] = useState(false);
  const [pageViewId, setPageViewId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const userHash = sessionData?.userHash || (window as any)?.sessionStorage?.getItem('aura_user_hash') || '';
        const projectId = await getOrCreateProjectId(userHash);
        if (projectId) {
          // Device context snapshot (once per page enter)
          const context = {
            userAgent: navigator.userAgent,
            language: navigator.language,
            viewport: { width: window.innerWidth, height: window.innerHeight, dpr: window.devicePixelRatio },
            network: (navigator as any)?.connection?.effectiveType || null,
          };
          await saveDeviceContext(projectId, context);
          // Page view start
          const pvId = await startPageView(projectId, 'photo', { roomTypeDefault: roomType });
          if (isMounted) setPageViewId(pvId);
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => {
      (async () => {
        if (pageViewId) await endPageView(pageViewId);
      })();
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Room type translations
  const ROOM_TYPE_TRANSLATIONS: { [key: string]: string } = {
    'kitchen': 'Kuchnia',
    'bedroom': 'Sypialnia',
    'living_room': 'Pokoj dzienny',
    'bathroom': 'Lazienka',
    'dining_room': 'Jadalnia',
    'office': 'Biuro',
    'empty_room': 'Puste pomieszczenie'
  };

  const generateLLMCommentAsync = useCallback(async (roomType: string, roomDescription: string) => {
    if (isGeneratingComment) return;
    
    console.log('Starting LLM comment generation...', { roomType, roomDescription });
    setIsGeneratingComment(true);
    try {
      const result = await generateLLMComment(roomType, roomDescription, 'room_analysis');
      console.log('LLM comment result:', result);
      setLlmComment(result);
    } catch (error) {
      console.error('Failed to generate LLM comment:', error);
      // Show error to user for debugging
      alert(`Blad generowania komentarza IDA: ${error}`);
    } finally {
      setIsGeneratingComment(false);
    }
  }, [generateLLMComment, isGeneratingComment]);

  const analyzeImage = useCallback(async (file: File) => {
    setIsAnalyzing(true);
    const startTime = Date.now();
    try {
      console.log('Starting room analysis for file:', file.name, 'size:', file.size, 'bytes');
      
      // Convert file to base64
      const base64Start = Date.now();
      const base64 = await toBase64(file);
      console.log(`File converted to base64 in ${Date.now() - base64Start}ms, length: ${base64.length} chars`);
      
      console.log('Calling analyzeRoom API...');
      const apiStart = Date.now();
      
      // Analyze room using MiniCPM-o-2.6 (now includes comment generation)
      const analysis = await analyzeRoom({ image: base64 });
      
      console.log(`API call completed in ${Date.now() - apiStart}ms`);
      console.log(`Total analysis time: ${Date.now() - startTime}ms`);
      
      console.log('Room analysis result:', analysis);
      console.log('Analysis comment field:', analysis.comment);
      console.log('Analysis human_comment field:', analysis.human_comment);
      console.log('Analysis keys:', Object.keys(analysis));
      
      setRoomAnalysis(analysis);
      setDetectedRoomType(analysis.detected_room_type);
      setRoomType(analysis.detected_room_type);
      
      // MiniCPM-o-2.6 now includes both English and Polish comments
      if (analysis.comment) {
        console.log('Setting LLM comment from MiniCPM-o-2.6 (English):', analysis.comment);
        setLlmComment({
          comment: analysis.comment,
          suggestions: analysis.suggestions || []
        });
      }
      
      // Set human Polish comment if available
      if (analysis.human_comment) {
        console.log('Setting human comment from IDA (Polish):', analysis.human_comment);
        setHumanComment(analysis.human_comment);
      } else {
        console.log('No human comment from MiniCPM-o-2.6, using fallback');
        // Fallback: generate comment separately (for backward compatibility)
        if (analysis.room_description) {
          generateLLMCommentAsync(analysis.detected_room_type, analysis.room_description);
        }
      }
      
    } catch (error) {
      console.error('Error analyzing room:', error);
      // Fallback to default room type
      setDetectedRoomType('living_room');
      setRoomType('living room');
    } finally {
      setIsAnalyzing(false);
    }
  }, [analyzeRoom, generateLLMCommentAsync]);

  // Corrected paths for example images
  const exampleImages = [
    '/images/tinder/Living Room (1).jpg',
    '/images/tinder/Living Room (2).jpg',
    '/images/tinder/Living Room (3).jpg',
  ];

  const handleFileSelect = async (file: File) => {
    setIsLoading(true);
    try {
      // Check for unsupported formats
      const unsupportedFormats = ['image/avif', 'image/webp', 'image/gif'];
      if (unsupportedFormats.includes(file.type)) {
        throw new Error(`Format ${file.type} nie jest obslugiwany. Proszę uzyc formatow: JPG, PNG, TIFF, HEIC.`);
      }
      
      // Validate file type - only basic formats
      if (!file.type.startsWith('image/')) {
        throw new Error(`Nieprawidlowy typ pliku: ${file.type}. Proszę wybrac obraz (JPG, PNG, TIFF, HEIC).`);
      }
      
      console.log(`Przetwarzam plik: ${file.name}, typ: ${file.type}, rozmiar: ${file.size} bytes`);
      
      const base64 = await toBase64(file);
      console.log(`Przekonwertowano do base64, dlugosc: ${base64.length} znakow`);
      
      await updateSession({ roomImage: base64 });
      setSelectedImage(URL.createObjectURL(file));
      
      // Automatically analyze the room
      await analyzeImage(file);
    } catch (error) {
      console.error("Error converting file to base64", error);
      alert(error instanceof Error ? error.message : "Blad podczas przetwarzania pliku");
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
      
      // Automatically analyze the room
      await analyzeImage(file);
    } catch (error) {
      console.error("Error fetching or converting example image", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = () => {
    if (selectedImage) {
      stopAllDialogueAudio(); // Zatrzymaj dzwiek przed nawigacja
      updateSession({ roomType });
      router.push('/flow/tinder');
    }
  };

  return (
    <div className="min-h-screen flex flex-col w-full">
      {/* Formularz upload */}
      <div className="flex-1 flex items-center justify-center p-4">
        <GlassCard className="w-full p-6 md:p-8 bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl rounded-2xl max-h-[90vh] overflow-auto scrollbar-hide">
          <h1 className="text-2xl md:text-3xl font-exo2 font-bold text-gray-800 mb-3">Dodaj zdjecie przestrzeni</h1>
          <p className="text-base md:text-lg text-gray-700 font-modern mb-3 leading-relaxed">
            Wgraj zdjecie swojego pokoju lub wybierz przykladowe, aby IDA mogla lepiej zrozumiec Twoj kontekst projektowy.
          </p>
          <p className="text-sm text-gray-600 mb-4">
            <strong>Obslugiwane formaty:</strong> JPG, PNG, TIFF, HEIC
          </p>
          
          {/* Room Analysis Results */}
          {isAnalyzing && (
            <div className="mb-6 p-6 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl">
              <div className="flex items-center gap-4">
                <div className="w-6 h-6 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                <div>
                  <p className="text-white/90 font-exo2 font-semibold text-lg">IDA analizuje pomieszczenie...</p>
                  <p className="text-white/60 text-sm font-modern">To może potrwać chwilę</p>
                </div>
              </div>
            </div>
          )}
          
          {detectedRoomType && !isAnalyzing && (
            <div className="mb-6 p-6 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <div className="w-4 h-4 bg-gradient-to-r from-amber-400 to-yellow-400 rounded-full"></div>
                </div>
                <div className="flex-1">
                  <p className="text-white/95 font-exo2 font-bold text-lg mb-3">
                    IDA (Gemma 3) wykryła: <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-400">{ROOM_TYPE_TRANSLATIONS[detectedRoomType] || detectedRoomType}</span>
                  </p>
                  {roomAnalysis?.room_description && (
                    <div className="mb-4" style={{ display: 'none' }}>
                      {/* Hidden technical description for LLM */}
                      <p className="text-sm text-white/70 font-modern leading-relaxed bg-white/5 p-4 rounded-xl border border-white/10">
                        {roomAnalysis.room_description}
                      </p>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowRoomTypeSelection(true)}
                      className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white/80 text-sm font-exo2 font-semibold rounded-xl transition-all duration-200 hover:scale-105 border border-white/20"
                    >
                      Zmień typ pomieszczenia
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* LLM Comment */}
          {isGeneratingComment && (
            <div className="mb-6 p-6 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl">
              <div className="flex items-center gap-4">
                <div className="w-6 h-6 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                <div>
                  <p className="text-white/90 font-exo2 font-semibold text-lg">IDA analizuje i przygotowuje komentarz...</p>
                  <p className="text-white/60 text-sm font-modern">To może potrwać chwilę</p>
                </div>
              </div>
            </div>
          )}

          {llmComment && !isGeneratingComment && (
            <div className="mb-6 p-6 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <div className="w-4 h-4 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full"></div>
                </div>
                <div className="flex-1">
                  <p className="text-white/95 font-exo2 font-bold text-lg mb-3">
                    Komentarz IDA (Gemma 3):
                  </p>
                  <p className="text-sm text-white/80 font-modern leading-relaxed bg-white/5 p-4 rounded-xl border border-white/10 mb-4">
                    {llmComment.comment}
                  </p>
                  
                  {/* Human Polish comment from IDA */}
                  {humanComment && (
                    <>
                      <p className="text-white/95 font-exo2 font-bold text-lg mb-3">
                        Komentarz IDA po polsku:
                      </p>
                      <p className="text-sm text-white/90 font-modern leading-relaxed bg-gradient-to-r from-blue-500/10 to-cyan-500/10 p-4 rounded-xl border border-blue-400/20 mb-4">
                        {humanComment}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Room type selection - hidden until "Zmień" is clicked */}
          {showRoomTypeSelection && (
            <div className="space-y-4 mb-4">
              <div>
                <h3 className="text-sm md:text-base font-bold text-gray-700 mb-1 font-exo2">Typ pomieszczenia</h3>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'living_room', label: 'Pokój dzienny' },
                    { id: 'bedroom', label: 'Sypialnia' },
                    { id: 'kitchen', label: 'Kuchnia' },
                    { id: 'dining_room', label: 'Jadalnia' },
                    { id: 'bathroom', label: 'Łazienka' },
                    { id: 'office', label: 'Biuro' },
                    { id: 'empty_room', label: 'Puste pomieszczenie' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setRoomType(opt.id);
                        setDetectedRoomType(opt.id);
                        setShowRoomTypeSelection(false);
                      }}
                      className={`px-3 py-2 rounded-xl text-sm border ${roomType === opt.id ? 'bg-gold/20 border-gold text-graphite' : 'bg-white/10 border-white/30 text-graphite hover:bg-white/20'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          <div>
            <h3 className="text-sm md:text-base font-bold text-gray-700 mb-1 font-exo2">Twoje zdjęcie</h3>
            <div className="flex flex-col items-center gap-2">
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/tiff,image/heic,image/heif"
                onChange={e => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-gold-50 file:text-gold-700 hover:file:bg-gold-100"
                disabled={isLoading || isAnalyzing}
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
                  disabled={isLoading || isAnalyzing}
                >
                  <Image src={img} alt={`Przykład ${idx + 1}`} width={96} height={64} className="rounded-xl" />
                </button>
              ))}
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
              className={`cursor-pointer select-none transition-transform duration-200 hover:scale-105 shadow-xl focus:outline-none focus:ring-2 focus:ring-gold-400 flex items-center justify-center text-base md:text-base font-exo2 font-bold text-white rounded-2xl text-nowrap ${!selectedImage || isLoading || isAnalyzing ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
              onClick={handleContinue}
              aria-label="Dalej"
              style={{ opacity: 1 }}
            >
              {isLoading ? 'Przetwarzanie...' : isAnalyzing ? 'Analizuje...' : 'Dalej'}
            </GlassSurface>
          </div>
        </GlassCard>
      </div>

      {/* Dialog IDA na dole - cala szerokosc */}
      <div className="w-full">
        <AwaDialogue 
          currentStep="upload" 
          fullWidth={true}
          autoHide={true}
        />
      </div>
    </div>
  );
}
