"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { AwaContainer } from '@/components/awa/AwaContainer';
import { AwaDialogue } from '@/components/awa/AwaDialogue';
import { useSessionData } from '@/hooks/useSessionData';
import { stopAllDialogueAudio } from '@/hooks/useAudioManager';
import { 
  Zap, 
  Sparkles, 
  Clock, 
  Heart,
  Image as ImageIcon,
  Layers
} from 'lucide-react';

/**
 * PathSelectionScreen - Choose between Fast Track and Full Experience
 * 
 * Fast Track: Quick photo → minimal swipes → generate (10x limit)
 * Full Experience: Complete deep personalization journey
 */
export default function PathSelectionScreen() {
  const router = useRouter();
  const { updateSessionData } = useSessionData();

  const handlePathSelection = async (pathType: 'fast' | 'full') => {
    stopAllDialogueAudio();
    
    await updateSessionData({
      pathType,
      pathSelectedAt: new Date().toISOString()
    });

    if (pathType === 'fast') {
      // Fast track: minimal flow
      router.push('/flow/fast-track');
    } else {
      // Full experience: complete personalization
      router.push('/flow/photo');
    }
  };

  return (
    <div className="min-h-screen flex flex-col w-full relative overflow-hidden">
      {/* Background effects matching existing screens */}
      <div className="absolute inset-0 bg-gradient-radial from-pearl-50 via-platinum-50 to-silver-100 -z-10" />
      
      <AwaContainer 
        currentStep="onboarding" 
        showDialogue={false}
        fullWidth={true}
        autoHide={false}
      />

      <div className="flex-1 p-4 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            {/* Header */}
            <div className="text-center mb-12">
              <motion.h1 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl font-nasalization mb-4 bg-gradient-to-r from-gold via-champagne to-platinum bg-clip-text text-transparent"
              >
                Wybierz Swoją Ścieżkę
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-base lg:text-lg xl:text-xl text-graphite font-modern max-w-2xl mx-auto"
              >
                Zdecyduj jak chcesz doświadczyć <span className="font-semibold text-gold">IDA</span> - szybko czy dogłębnie
              </motion.p>
            </div>

            {/* Path Options */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              
              {/* FAST TRACK */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                whileHover={{ scale: 1.02, y: -5 }}
                className="h-full"
              >
                <GlassCard 
                  className="p-6 lg:p-8 h-full flex flex-col hover:shadow-2xl hover:border-blue-300/50 transition-all duration-500 cursor-pointer group relative overflow-hidden"
                  onClick={() => handlePathSelection('fast')}
                >
                  {/* Animated gradient overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-400/5 to-cyan-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                  
                  <div className="flex items-center gap-4 mb-6 relative z-10">
                    <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-2xl bg-gradient-to-br from-blue-400 via-cyan-400 to-blue-500 flex items-center justify-center shadow-lg group-hover:shadow-blue-300/50 transition-shadow duration-300">
                      <Zap className="text-white group-hover:scale-110 transition-transform duration-300" size={28} />
                    </div>
                    <div>
                      <h2 className="text-2xl lg:text-3xl xl:text-4xl font-nasalization text-graphite group-hover:text-blue-600 transition-colors">
                        Szybka Ścieżka
                      </h2>
                      <p className="text-xs lg:text-sm text-silver-dark font-modern">Fast Track</p>
                    </div>
                  </div>

                  <div className="flex-1 space-y-5 mb-6 relative z-10">
                    <p className="text-graphite font-modern text-base lg:text-lg leading-relaxed">
                      Wypróbuj IDA szybko - prześlij zdjęcie, przesuń kilka inspiracji i generuj!
                    </p>

                    <div className="space-y-4">
                      <div className="flex items-start gap-3 glass-panel rounded-xl p-3 group-hover:bg-white/40 transition-colors">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center flex-shrink-0">
                          <Clock size={18} className="text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm lg:text-base font-semibold text-graphite">~3-5 minut</p>
                          <p className="text-xs lg:text-sm text-silver-dark">Minimalna ilość pytań</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 glass-panel rounded-xl p-3 group-hover:bg-white/40 transition-colors">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center flex-shrink-0">
                          <ImageIcon size={18} className="text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm lg:text-base font-semibold text-graphite">10 generacji</p>
                          <p className="text-xs lg:text-sm text-silver-dark">Eksperymentuj z modyfikacjami</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 glass-panel rounded-xl p-3 group-hover:bg-white/40 transition-colors">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center flex-shrink-0">
                          <Sparkles size={18} className="text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm lg:text-base font-semibold text-graphite">Bazowa personalizacja</p>
                          <p className="text-xs lg:text-sm text-silver-dark">Styl wizualny z szybkich swipes</p>
                        </div>
                      </div>
                    </div>

                    <div className="glass-panel rounded-xl p-4 bg-gradient-to-br from-blue-50/50 to-cyan-50/50 border-blue-200/30">
                      <p className="text-xs lg:text-sm text-graphite font-modern">
                        <strong className="text-blue-600">Idealne dla:</strong> Szybkiego testu, ciekawości, pierwszego kontaktu z AI design
                      </p>
                    </div>
                  </div>

                  <GlassButton 
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePathSelection('fast');
                    }}
                    className="w-full group-hover:scale-105 transition-transform"
                    variant="secondary"
                  >
                    <Zap size={18} className="mr-2" />
                    Zacznij Szybko
                  </GlassButton>
                </GlassCard>
              </motion.div>

              {/* FULL EXPERIENCE */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                whileHover={{ scale: 1.02, y: -5 }}
                className="h-full"
              >
                <GlassCard 
                  variant="highlighted"
                  className="p-6 lg:p-8 h-full flex flex-col hover:shadow-2xl hover:border-gold/50 transition-all duration-500 cursor-pointer group relative overflow-hidden"
                  onClick={() => handlePathSelection('full')}
                >
                  {/* Animated gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-gold/10 via-champagne/5 to-platinum/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                  <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-gold/20 to-champagne/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
                  
                  {/* Recommended badge */}
                  <motion.div 
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ duration: 0.6, delay: 0.8, type: "spring" }}
                    className="absolute top-4 right-4 bg-gradient-to-r from-gold via-champagne to-gold text-white px-4 py-2 rounded-full text-xs lg:text-sm font-bold shadow-lg z-20 animate-pulse"
                  >
                    ✨ Polecane
                  </motion.div>

                  <div className="flex items-center gap-4 mb-6 relative z-10">
                    <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-2xl bg-gradient-to-br from-gold via-champagne to-gold flex items-center justify-center shadow-xl group-hover:shadow-gold/50 transition-shadow duration-300">
                      <Heart className="text-white group-hover:scale-110 transition-transform duration-300" size={28} fill="currentColor" />
                    </div>
                    <div>
                      <h2 className="text-2xl lg:text-3xl xl:text-4xl font-nasalization bg-gradient-to-r from-gold to-champagne bg-clip-text text-transparent group-hover:from-gold-600 group-hover:to-champagne-600 transition-all">
                        Pełne Doświadczenie
                      </h2>
                      <p className="text-xs lg:text-sm text-silver-dark font-modern">Full Experience</p>
                    </div>
                  </div>

                  <div className="flex-1 space-y-5 mb-6 relative z-10">
                    <p className="text-graphite font-modern text-base lg:text-lg leading-relaxed">
                      Pozwól IDA poznać Cię głęboko - stwórz wnętrze które naprawdę odzwierciedla <strong className="text-gold">KIM jesteś</strong>.
                    </p>

                    <div className="space-y-4">
                      <div className="flex items-start gap-3 glass-panel rounded-xl p-3 group-hover:bg-white/40 transition-colors">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gold-100 to-champagne-100 flex items-center justify-center flex-shrink-0">
                          <Clock size={18} className="text-gold-600" />
                        </div>
                        <div>
                          <p className="text-sm lg:text-base font-semibold text-graphite">~15-20 minut</p>
                          <p className="text-xs lg:text-sm text-silver-dark">Pogłębiony wywiad z IDA</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 glass-panel rounded-xl p-3 group-hover:bg-white/40 transition-colors">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gold-100 to-champagne-100 flex items-center justify-center flex-shrink-0">
                          <Layers size={18} className="text-gold-600" />
                        </div>
                        <div>
                          <p className="text-sm lg:text-base font-semibold text-graphite">Nieograniczone generacje</p>
                          <p className="text-xs lg:text-sm text-silver-dark">Twórz i modyfikuj bez limitów</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 glass-panel rounded-xl p-3 group-hover:bg-white/40 transition-colors">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gold-100 to-champagne-100 flex items-center justify-center flex-shrink-0">
                          <Heart size={18} className="text-gold-600" fill="currentColor" />
                        </div>
                        <div>
                          <p className="text-sm lg:text-base font-semibold text-graphite">Głęboka personalizacja</p>
                          <p className="text-xs lg:text-sm text-silver-dark">Psychologia + preferencje + styl życia</p>
                        </div>
                      </div>
                    </div>

                    <div className="glass-panel rounded-xl p-4 bg-gradient-to-br from-gold-50/50 to-champagne-50/50 border-gold-200/30">
                      <p className="text-xs lg:text-sm text-graphite font-modern">
                        <strong className="text-gold-600">Idealne dla:</strong> Prawdziwej personalizacji, projektowania wnętrza które jest TWOJE, wkładu w badania naukowe
                      </p>
                    </div>

                    <div className="space-y-3 pt-2">
                      <p className="text-xs lg:text-sm font-semibold text-graphite flex items-center gap-2">
                        <Sparkles size={16} className="text-gold" />
                        Co zyskujesz:
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {['Tinder swipes', 'Mapa nastroju', 'Test zmysłów', 'Analiza pokoju', 'Drabina potrzeb', 'Multi-room'].map((feature, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs lg:text-sm text-silver-dark">
                            <div className="w-1.5 h-1.5 rounded-full bg-gold" />
                            {feature}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <GlassButton 
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePathSelection('full');
                    }}
                    className="w-full group-hover:scale-105 transition-transform"
                  >
                    <Heart size={18} className="mr-2" />
                    Zacznij Pełne Doświadczenie
                  </GlassButton>
                </GlassCard>
              </motion.div>
            </div>

            {/* Footer note */}
            <div className="text-center mt-8">
              <p className="text-sm text-gray-500 font-modern">
                💡 Zawsze możesz wrócić i spróbować drugiej ścieżki później
              </p>
            </div>
          </motion.div>
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

