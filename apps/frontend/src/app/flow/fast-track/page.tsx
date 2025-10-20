"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useSessionData } from '@/hooks/useSessionData';
import { useLanguage } from '@/contexts/LanguageContext';
import { useModalAPI } from '@/hooks/useModalAPI';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { AwaContainer } from '@/components/awa/AwaContainer';
import { AwaDialogue } from '@/components/awa/AwaDialogue';
import { LoadingProgress } from '@/components/ui/LoadingProgress';
import { Camera, Zap, ArrowRight, Image as ImageIcon, AlertCircle } from 'lucide-react';
import Image from 'next/image';

type FastTrackStep = 'upload' | 'quick_swipes' | 'generation';

/**
 * Fast Track Flow - Quick experience (3-5 min, 10 generation limit)
 * 
 * Flow:
 * 1. Photo upload → AI analysis
 * 2. Quick swipes (10 images) for basic style detection
 * 3. Generate with simple prompt
 * 4. 10x generation limit, then prompt to upgrade to Full Experience
 */
export default function FastTrackPage() {
  const router = useRouter();
  const { sessionData, updateSessionData } = useSessionData();
  const { language } = useLanguage();
  const { generateImages, analyzeRoom, isLoading } = useModalAPI();
  
  const [currentStep, setCurrentStep] = useState<FastTrackStep>('upload');
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);
  const [roomAnalysis, setRoomAnalysis] = useState<any>(null);
  const [quickSwipes, setQuickSwipes] = useState<string[]>([]);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [generationCount, setGenerationCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const MAX_GENERATIONS = 10;
  const generationsRemaining = MAX_GENERATIONS - generationCount;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setUploadedPhoto(base64);

      // Analyze room with AI
      try {
        const analysis = await analyzeRoom({ image: base64 });
        setRoomAnalysis(analysis);
        
        await updateSessionData({
          roomImage: base64,
          roomAnalysis: analysis,
          detectedRoomType: analysis?.detected_room_type,
        });
      } catch (error) {
        console.error('Room analysis failed:', error);
        setError(language === 'pl' ? 'Nie udało się przeanalizować zdjęcia' : 'Failed to analyze photo');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSwipeComplete = (swipes: string[]) => {
    setQuickSwipes(swipes);
    setCurrentStep('generation');
    generateInitialDesign();
  };

  const generateInitialDesign = async () => {
    if (!uploadedPhoto) return;
    if (generationCount >= MAX_GENERATIONS) {
      // Prompt upgrade
      return;
    }

    try {
      const simplePrompt = buildFastTrackPrompt();
      
      const response = await generateImages({
        prompt: simplePrompt,
        base_image: uploadedPhoto,
        style: 'modern',
        modifications: [],
        num_images: 1,
        strength: 0.65,
        steps: 28,
        guidance: 3.5,
      });

      if (response && response.images) {
        setGeneratedImages(response.images.map(img => `data:image/png;base64,${img}`));
        setGenerationCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Generation failed:', error);
      setError(language === 'pl' ? 'Generacja nie powiodła się' : 'Generation failed');
    }
  };

  const buildFastTrackPrompt = (): string => {
    const roomType = roomAnalysis?.detected_room_type || 'interior';
    // Simple prompt based on room analysis
    return `Modern ${roomType} with clean aesthetic, professional interior photography`;
  };

  const handleUpgradeToFull = () => {
    router.push('/setup/profile');
  };

  return (
    <div className="min-h-screen flex flex-col w-full relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-radial from-pearl-50 via-platinum-50 to-silver-100 -z-10" />
      
      <AwaContainer 
        currentStep="onboarding" 
        showDialogue={false}
        fullWidth={true}
        autoHide={false}
      />

      <div className="flex-1 p-4 lg:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center">
                <Zap size={24} className="text-white" />
              </div>
              <h1 className="text-3xl lg:text-4xl font-nasalization bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                {language === 'pl' ? 'Szybka Ścieżka' : 'Fast Track'}
              </h1>
            </div>

            {/* Generation counter */}
            {generationCount > 0 && (
              <div className="inline-block glass-panel px-4 py-2 rounded-full">
                <p className="text-sm font-modern text-graphite">
                  {language === 'pl' ? 'Generacje:' : 'Generations:'}{' '}
                  <span className={generationsRemaining <= 3 ? 'text-orange-600 font-bold' : 'text-gold font-semibold'}>
                    {generationCount} / {MAX_GENERATIONS}
                  </span>
                </p>
              </div>
            )}
          </motion.div>

          <AnimatePresence mode="wait">
            {currentStep === 'upload' && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <GlassCard className="p-8 lg:p-12">
                  <div className="text-center mb-8">
                    <h2 className="text-2xl lg:text-3xl font-nasalization text-graphite mb-4">
                      {language === 'pl' ? 'Prześlij Zdjęcie Pokoju' : 'Upload Room Photo'}
                    </h2>
                    <p className="text-graphite font-modern">
                      {language === 'pl'
                        ? 'To wszystko czego potrzebujemy aby zacząć!'
                        : 'That\'s all we need to get started!'}
                    </p>
                  </div>

                  {!uploadedPhoto ? (
                    <div className="glass-panel rounded-2xl p-12 border-2 border-dashed border-gold/40 hover:border-gold/60 transition-colors">
                      <label className="cursor-pointer flex flex-col items-center">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gold to-champagne flex items-center justify-center mb-4">
                          <Camera size={40} className="text-white" />
                        </div>
                        <p className="text-xl font-nasalization text-graphite mb-2">
                          {language === 'pl' ? 'Dodaj Zdjęcie' : 'Add Photo'}
                        </p>
                        <p className="text-sm text-silver-dark">
                          {language === 'pl' ? 'Kliknij lub przeciągnij' : 'Click or drag and drop'}
                        </p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="relative aspect-video rounded-2xl overflow-hidden">
                        <Image src={uploadedPhoto} alt="Room" fill className="object-cover" />
                      </div>

                      {isLoading && (
                        <div className="text-center">
                          <LoadingProgress message={language === 'pl' ? 'Analizuję pokój...' : 'Analyzing room...'} />
                        </div>
                      )}

                      {roomAnalysis && (
                        <GlassCard className="p-6 bg-gradient-to-br from-green-50/50 to-emerald-50/50">
                          <p className="text-sm font-modern text-graphite mb-2">
                            <strong className="text-emerald-600">IDA:</strong> {roomAnalysis.human_comment || roomAnalysis.comment}
                          </p>
                          <p className="text-xs text-silver-dark">
                            {language === 'pl' ? 'Wykryto:' : 'Detected:'} {roomAnalysis.detected_room_type}
                          </p>
                        </GlassCard>
                      )}

                      <GlassButton onClick={() => setCurrentStep('generation')} className="w-full">
                        {language === 'pl' ? 'Generuj Teraz' : 'Generate Now'}
                        <Zap size={18} className="ml-2" />
                      </GlassButton>
                    </div>
                  )}
                </GlassCard>
              </motion.div>
            )}

            {currentStep === 'generation' && (
              <motion.div
                key="generation"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {generationsRemaining <= 0 ? (
                  <UpgradePrompt onUpgrade={handleUpgradeToFull} />
                ) : (
                  <div className="space-y-6">
                    {/* Generated images */}
                    {generatedImages.length > 0 && (
                      <GlassCard className="p-6">
                        <div className="relative aspect-video rounded-xl overflow-hidden mb-4">
                          <Image src={generatedImages[0]} alt="Generated" fill className="object-cover" />
                        </div>
                        
                        <div className="flex gap-3">
                          <GlassButton onClick={generateInitialDesign} className="flex-1">
                            <Zap size={18} className="mr-2" />
                            {language === 'pl' ? 'Generuj Nowy' : 'Generate New'}
                          </GlassButton>
                          <GlassButton onClick={handleUpgradeToFull} variant="secondary" className="flex-1">
                            {language === 'pl' ? 'Przejdź na Full' : 'Upgrade to Full'}
                          </GlassButton>
                        </div>
                      </GlassCard>
                    )}

                    {isLoading && (
                      <LoadingProgress message={language === 'pl' ? 'Generuję...' : 'Generating...'} />
                    )}

                    {error && (
                      <GlassCard className="p-6 border-red-300">
                        <p className="text-red-600">{error}</p>
                      </GlassCard>
                    )}

                    {/* Generations remaining warning */}
                    {generationsRemaining <= 3 && generationsRemaining > 0 && (
                      <GlassCard className="p-4 bg-gradient-to-br from-orange-50 to-yellow-50 border-orange-200">
                        <div className="flex items-center gap-3">
                          <AlertCircle size={20} className="text-orange-600" />
                          <p className="text-sm font-modern text-orange-800">
                            {language === 'pl' 
                              ? `Zostało ${generationsRemaining} generacji. Przejdź na Full Experience dla nieograniczonego dostępu!`
                              : `${generationsRemaining} generations remaining. Upgrade to Full Experience for unlimited access!`}
                          </p>
                        </div>
                      </GlassCard>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="w-full">
        <AwaDialogue 
          currentStep="onboarding" 
          fullWidth={true}
          autoHide={true}
        />
      </div>
    </div>
  );
}

function UpgradePrompt({ onUpgrade }: { onUpgrade: () => void }) {
  const { language } = useLanguage();

  return (
    <GlassCard className="p-8 lg:p-12 text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
        className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-gold via-champagne to-platinum flex items-center justify-center"
      >
        <Zap size={40} className="text-white" />
      </motion.div>

      <h2 className="text-3xl lg:text-4xl font-nasalization bg-gradient-to-r from-gold to-champagne bg-clip-text text-transparent mb-4">
        {language === 'pl' ? 'Osiągnięto Limit!' : 'Limit Reached!'}
      </h2>

      <p className="text-graphite font-modern mb-8 max-w-xl mx-auto">
        {language === 'pl'
          ? 'Wykorzystałeś 10 generacji w Fast Track. Chcesz więcej? Przejdź na Full Experience dla nieograniczonego dostępu i głębokiej personalizacji!'
          : 'You\'ve used 10 generations in Fast Track. Want more? Upgrade to Full Experience for unlimited access and deep personalization!'}
      </p>

      <div className="space-y-4">
        <GlassButton onClick={onUpgrade} className="px-8 py-4">
          {language === 'pl' ? 'Przejdź na Full Experience' : 'Upgrade to Full Experience'}
          <ArrowRight size={20} className="ml-2" />
        </GlassButton>

        <p className="text-sm text-silver-dark font-modern">
          {language === 'pl' 
            ? 'Pełne doświadczenie obejmuje: psychologię, multi-room support, nieograniczone generacje i więcej!'
            : 'Full experience includes: psychology, multi-room support, unlimited generations, and more!'}
        </p>
      </div>
    </GlassCard>
  );
}

