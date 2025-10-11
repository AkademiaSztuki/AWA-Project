'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useSession } from '@/hooks';
import { GlassCard } from '@/components/ui/GlassCard';
import GlassSurface from 'src/components/ui/GlassSurface';
import { Dna, Palette, Home, Lightbulb } from 'lucide-react';
import { computeWeightedDNAFromSwipes, buildFluxPromptFromDNA } from '@/lib/dna';
import { getOrCreateProjectId, updateDiscoverySession, saveTinderSwipes, saveDnaSnapshot, startPageView, endPageView } from '@/lib/supabase';
import { AwaContainer, AwaDialogue } from '@/components/awa';
import { stopAllDialogueAudio } from '@/hooks/useAudioManager';

interface DNAAnalysis {
  dominantStyle: string;
  colorPalette: string;
  materials: string;
  lighting: string;
  mood: string;
  confidence: number;
}

export default function VisualDNAPage() {
  const router = useRouter();
  const { sessionData, updateSession } = useSession();
  const [dnaAnalysis, setDnaAnalysis] = useState<DNAAnalysis | null>(null);
  const [accuracyRating, setAccuracyRating] = useState<number>(4);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [pageViewId, setPageViewId] = useState<string | null>(null);

  useEffect(() => {
    analyzeDNA();
    (async () => {
      try {
        const projectId = await getOrCreateProjectId((sessionData as any).userHash);
        if (projectId) {
          const id = await startPageView(projectId, 'dna');
          setPageViewId(id);
        }
      } catch {}
    })();
    return () => { (async () => { if (pageViewId) await endPageView(pageViewId); })(); };
  }, []);

  const analyzeDNA = async () => {
    setIsAnalyzing(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    const tinderData = sessionData.tinderData;
    const likes = tinderData?.swipes?.filter((s: any) => s.direction === 'right') || [];

    const weighted = computeWeightedDNAFromSwipes(likes, tinderData?.totalImages || likes.length || 30);
    const dominantStyle = weighted.top.styles.join(' + ') || 'Modern';
    const colorPalette = weighted.top.colors.join(' + ') || 'Neutral colors';
    const materials = weighted.top.materials.join(' + ') || 'Natural materials';
    const lighting = weighted.top.lighting.join(' + ') || 'Soft lighting';
    const mood = weighted.top.mood.join(' + ') || 'Cozy';

    const analysis: DNAAnalysis = {
      dominantStyle,
      colorPalette,
      materials,
      lighting,
      mood,
      confidence: weighted.confidence,
    };
    setDnaAnalysis(analysis);
    setIsAnalyzing(false);
    setShowResults(true);

    // Update session with structured preferences (used later in generation)
    await updateSession({
      visualDNA: {
        dominantTags: [dominantStyle, ...weighted.top.colors, ...weighted.top.materials].filter(Boolean),
        preferences: {
          colors: weighted.top.colors,
          materials: weighted.top.materials,
          styles: weighted.top.styles,
          lighting: weighted.top.lighting,
        },
        accuracyScore: Math.round(weighted.confidence),
        // Extended fields for convenience in prompt building
        dominantStyle,
        colorPalette,
        materialsSummary: materials,
        lightingSummary: lighting,
        moodSummary: mood,
      } as any,
      dnaAnalysisComplete: true,
    });

    // Persist swipes + discovery session to Supabase
    try {
      const projectId = await getOrCreateProjectId((sessionData as any).userHash);
      if (projectId) {
        await saveTinderSwipes(projectId, tinderData?.swipes || []);
        await updateDiscoverySession(
          projectId,
          (sessionData as any).visualDNA,
          Math.round(weighted.confidence),
          (sessionData as any).ladderResults?.path || [],
          (sessionData as any).ladderResults?.coreNeed || 'unknown'
        );
        await saveDnaSnapshot(projectId, {
          weights: (weighted as any).weights,
          top: (weighted as any).top,
          confidence: weighted.confidence,
          parser_version: 'v1'
        });
      }
    } catch (e) {
      console.warn('Supabase persist failed (DNA):', e);
    }

    // Server-side debug log to terminal (Next.js dev server)
    try {
      await fetch('/api/debug/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'DNA_ANALYSIS',
          likesCount: likes.length,
          weightedTop: weighted.top,
          confidence: weighted.confidence,
          promptPreview: buildFluxPromptFromDNA(weighted, 'living room'),
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (e) {
      // ignore
    }
  };

  const getDominantValue = () => null; // unused now

  const handleAccuracySubmit = async () => {
    stopAllDialogueAudio(); // Zatrzymaj dźwięk przed nawigacją
    await updateSession({
      dnaAccuracyScore: accuracyRating,
      dnaFeedbackTime: new Date().toISOString(),
    });
    router.push('/flow/ladder');
  };

  return (
    <div className="min-h-screen flex flex-col w-full">
      <div className="flex-1 flex items-center justify-center p-8">
        <GlassCard className="w-full p-6 md:p-8 bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl rounded-[48px] max-h-[90vh] overflow-auto scrollbar-hide">
        {isAnalyzing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="w-24 h-24 mx-auto mb-8"
            >
              <Dna size={96} className="text-gold" />
            </motion.div>
            <h2 className="text-2xl md:text-3xl font-exo2 font-bold text-gray-800 mb-3">
              Odkrywam Twoje Wizualne DNA
            </h2>
            <p className="text-base md:text-lg text-gray-700 font-modern mb-3">
              Analizuję wzorce w Twoich wyborach...
            </p>
            <div className="mt-6">
              <div className="flex justify-center space-x-2">
                {[1, 2, 3].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                    className="w-3 h-3 bg-gold rounded-full"
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
        {showResults && dnaAnalysis && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full"
          >
            <div className="text-center mb-8">
              <h1 className="text-2xl md:text-3xl font-exo2 font-bold text-gray-800 mb-3">
                Twoje Wizualne DNA
              </h1>
              <p className="text-base md:text-lg text-gray-700 font-modern mb-3">
                Na podstawie {(sessionData.tinderData?.swipes?.filter((s: any) => s.direction === 'right').length) || 0} polubionych wnętrz
              </p>
            </div>
            <div className="relative w-[320px] h-[320px] mx-auto mt-8">
              {[
                {
                  icon: <Home className="text-gold" size={32} />,
                  label: dnaAnalysis.dominantStyle,
                  labelPrefix: 'Styl',
                },
                {
                  icon: <Palette className="text-gold" size={32} />,
                  label: dnaAnalysis.colorPalette,
                  labelPrefix: 'Paleta',
                },
                {
                  icon: <Lightbulb className="text-gold" size={32} />,
                  label: dnaAnalysis.lighting,
                  labelPrefix: 'Oświetlenie',
                },
                {
                  icon: <svg xmlns="http://www.w3.org/2000/svg" className="lucide lucide-layers text-gold" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
                  label: dnaAnalysis.materials,
                  labelPrefix: 'Materiały',
                },
                {
                  icon: <svg xmlns="http://www.w3.org/2000/svg" className="lucide lucide-smile text-gold" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 15s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01"/><path d="M15 9h.01"/></svg>,
                  label: dnaAnalysis.mood,
                  labelPrefix: 'Nastrój',
                },
              ].map((item, i, arr) => {
                const radius = 120;
                const angle = (i / arr.length) * 2 * Math.PI - Math.PI / 2;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                return (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      left: `calc(50% + ${x}px)`,
                      top: `calc(50% + ${y}px)`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    <motion.div
                      whileHover={{ scale: 1.3, zIndex: 10 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20, duration: 0.18 }}
                    >
                      <GlassCard className="group w-24 h-24 flex flex-col items-center justify-center rounded-full bg-gradient-to-br from-gold/20 to-silver/20 cursor-pointer transition-all overflow-hidden p-0">
                        <span className="flex items-center justify-center mt-2">
                          {item.icon}
                        </span>
                        <span className="mt-1 text-[7px] text-graphite font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-150 delay-100 text-center px-2" style={{ pointerEvents: 'none' }}>
                          {item.labelPrefix}: {item.label}
                        </span>
                      </GlassCard>
                    </motion.div>
                  </div>
                );
              })}
            </div>
            <div className="mb-8">
              <div className="text-center mb-2">
                <h3 className="text-xl font-semibold text-graphite mb-2 mt-2">
                  Pewność Analizy: {Math.round(dnaAnalysis.confidence)}%
                </h3>
              </div>
              <div className="w-full bg-silver/20 rounded-full h-4">
                <motion.div
                  className="bg-gradient-to-r from-gold to-green-500 h-4 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${dnaAnalysis.confidence}%` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                />
              </div>
            </div>
            <div className="text-center mb-4">
              <h3 className="text-xl font-semibold text-graphite mb-4">
                Jak trafnie opisuje to Twoje preferencje?
              </h3>
              <div className="flex justify-center items-center space-x-1 mb-6 overflow-x-auto">
                <span className="text-silver-dark">Zupełnie nie</span>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5, 6, 7].map((rating) => (
                    <motion.button
                      key={rating}
                      whileHover={{ scale: 1.0 }}
                      whileTap={{ scale: 0.8 }}
                      onClick={() => setAccuracyRating(rating)}
                      className={`w-8 h-8 rounded-full border-2 ${
                        accuracyRating >= rating
                          ? 'bg-gold border-gold text-white'
                          : 'border-silver text-silver-dark hover:border-gold'
                      }`}
                    >
                      {rating}
                    </motion.button>
                  ))}
                </div>
                <span className="text-silver-dark">Idealnie</span>
              </div>
              <p className="text-sm text-silver-dark">
                Twoja ocena: {accuracyRating}/7
              </p>
            </div>
            <div className="flex justify-center">
              <GlassSurface
                width={260}
                height={56}
                borderRadius={32}
                className="cursor-pointer select-none transition-transform duration-200 hover:scale-105 shadow-xl focus:outline-none focus:ring-2 focus:ring-gold-400 rounded-2xl flex items-center justify-center text-base font-exo2 font-bold text-white"
                onClick={handleAccuracySubmit}
                aria-label="Odkryj Głębsze Potrzeby"
                style={{ opacity: 1 }}
              >
                Odkryj Głębsze Potrzeby
              </GlassSurface>
            </div>
          </motion.div>
        )}
      </GlassCard>
      </div>

      {/* Dialog IDA na dole - cała szerokość */}
      <div className="w-full">
        <AwaDialogue 
          currentStep="dna" 
          fullWidth={true}
          autoHide={true}
        />
      </div>
    </div>
  );
}
