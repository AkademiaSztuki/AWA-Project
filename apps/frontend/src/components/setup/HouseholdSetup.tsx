"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { AwaDialogue } from '@/components/awa/AwaDialogue';
import { Home, Users, Target, ArrowRight, ArrowLeft } from 'lucide-react';
import { saveHousehold } from '@/lib/supabase-deep-personalization';
import { useSession } from '@/hooks';

interface HouseholdData {
  name: string;
  type: string;
  livingSituation: string;
  householdDynamics?: {
    decisionMaker: string;
    tasteAlignment: string;
    conflicts?: string[];
  };
  goals: string[];
}

/**
 * HouseholdSetup - Tier 2 setup (per household)
 * 
 * Collects:
 * - Household name and type
 * - Who lives there
 * - Dynamics (if not alone)
 * - Household goals
 * 
 * Takes ~2-3 minutes
 */
export function HouseholdSetup() {
  const router = useRouter();
  const { language } = useLanguage();
  const { sessionData } = useSession();
  
  const [step, setStep] = useState(1);
  const [householdData, setHouseholdData] = useState<HouseholdData>({
    name: '',
    type: 'home',
    livingSituation: '',
    goals: []
  });
  const [isSaving, setIsSaving] = useState(false);

  const totalSteps = householdData.livingSituation === 'alone' ? 3 : 4;

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      console.log('[HouseholdSetup] Saving household:', householdData);
      
      // Get user_hash from session
      const userHash = sessionData?.userHash || (window as any)?.sessionStorage?.getItem('aura_user_hash') || '';
      
      if (!userHash) {
        console.error('[HouseholdSetup] No user hash found!');
        alert('Musisz być zalogowany aby kontynuować');
        return;
      }
      
      let householdId = `household-${Date.now()}`; // Fallback ID
      
      // Try to save to Supabase, but don't block if it fails
      try {
        const savedHousehold = await saveHousehold({
          userHash,
          name: householdData.name,
          householdType: householdData.type,
          livingSituation: householdData.livingSituation,
          householdDynamics: householdData.householdDynamics,
          householdGoals: householdData.goals
        });
        
        if (savedHousehold) {
          householdId = savedHousehold.id;
          console.log('[HouseholdSetup] Household saved with ID:', savedHousehold.id);
        }
      } catch (dbError) {
        console.warn('[HouseholdSetup] Could not save to DB (migrations not applied?), using mock ID:', dbError);
        // Continue with mock ID
      }
      
      // Navigate to add first room
      console.log('[HouseholdSetup] Navigating to room setup:', `/setup/room/${householdId}`);
      router.push(`/setup/room/${householdId}`);
      
    } catch (error) {
      console.error('[HouseholdSetup] Error in handleSubmit:', error);
      alert('Błąd podczas zapisywania. Spróbuj ponownie.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col w-full relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-radial from-pearl-50 via-platinum-50 to-silver-100 -z-10" />
      
      {/* Dialog IDA na dole - cała szerokość */}
      <div className="w-full">
        <AwaDialogue 
          currentStep="onboarding" 
          fullWidth={true}
          autoHide={true}
        />
      </div>

      <div className="flex-1 p-4 lg:p-8 pb-32">
        <div className="max-w-3xl mx-auto">
          {/* Progress */}
          <div className="mb-8 h-12">
            <div className="flex items-center justify-between text-sm text-silver-dark mb-2 font-modern h-6">
              <span aria-live="polite" aria-atomic="true">
                {language === 'pl' ? 'Krok' : 'Step'} {step} / {totalSteps}
              </span>
              <span aria-live="polite" aria-atomic="true">{Math.round((step / totalSteps) * 100)}%</span>
            </div>
            <div className="glass-panel rounded-full h-3 overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-to-r from-gold via-champagne to-gold"
                animate={{ width: `${(step / totalSteps) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <GlassCard className="p-6 lg:p-8 min-h-[600px] max-h-[min(85vh,800px)] overflow-auto scrollbar-hide">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold to-champagne flex items-center justify-center">
                      <Home size={24} className="text-white" aria-hidden="true" />
                    </div>
                    <h1 className="text-2xl lg:text-3xl font-nasalization text-graphite">
                      {language === 'pl' ? 'Nazwa Przestrzeni' : 'Space Name'}
                    </h1>
                  </div>

                  <label 
                    htmlFor="household-name-input"
                    className="block text-graphite font-modern mb-2"
                  >
                    {language === 'pl'
                      ? 'Jak nazwiemy tę przestrzeń?'
                      : 'What should we call this space?'}
                  </label>

                  <input
                    id="household-name-input"
                    type="text"
                    value={householdData.name}
                    onChange={(e) => setHouseholdData({ ...householdData, name: e.target.value })}
                    placeholder={language === 'pl' ? 'np. Mój Dom, Biuro, Apartament...' : 'e.g. My Home, Office, Apartment...'}
                    className="w-full glass-panel rounded-xl p-4 font-modern text-graphite placeholder-silver-dark focus:outline-none focus:border-gold/50 transition-colors mb-6"
                  />

                  <p className="text-sm text-silver-dark font-modern mb-4">
                    {language === 'pl' ? 'Typ przestrzeni:' : 'Space type:'}
                  </p>

                  <div className="grid grid-cols-2 gap-3 mb-8">
                    {[
                      { id: 'home', label: language === 'pl' ? 'Dom/Mieszkanie' : 'Home/Apartment' },
                      { id: 'office', label: language === 'pl' ? 'Biuro' : 'Office' },
                      { id: 'vacation', label: language === 'pl' ? 'Dom wakacyjny' : 'Vacation Home' },
                      { id: 'other', label: language === 'pl' ? 'Inne' : 'Other' }
                    ].map((type) => (
                      <button
                        key={type.id}
                        onClick={() => setHouseholdData({ ...householdData, type: type.id })}
                        className={`rounded-xl p-4 text-sm font-modern font-semibold transition-all duration-300 cursor-pointer group ${
                          householdData.type === type.id
                            ? 'bg-gold/30 border-2 border-gold text-graphite shadow-lg'
                            : 'bg-white/10 border border-white/30 text-graphite hover:bg-gold/10 hover:border-gold/50 hover:text-gold-700'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex justify-end">
                    <GlassButton 
                      onClick={() => setStep(2)}
                      disabled={!householdData.name.trim()}
                    >
                      {language === 'pl' ? 'Dalej' : 'Next'}
                      <ArrowRight size={18} aria-hidden="true" />
                    </GlassButton>
                  </div>
                </GlassCard>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <GlassCard className="p-6 lg:p-8 min-h-[600px] max-h-[min(85vh,800px)] overflow-auto scrollbar-hide">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold to-champagne flex items-center justify-center">
                      <Users size={24} className="text-white" aria-hidden="true" />
                    </div>
                    <h1 className="text-2xl lg:text-3xl font-nasalization text-graphite">
                      {language === 'pl' ? 'Kto Tu Mieszka?' : 'Who Lives Here?'}
                    </h1>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                    {[
                      { id: 'alone', label: language === 'pl' ? 'Sam/sama' : 'Alone' },
                      { id: 'partner', label: language === 'pl' ? 'Z partnerem/partnerką' : 'With partner' },
                      { id: 'family', label: language === 'pl' ? 'Z rodziną' : 'With family' },
                      { id: 'roommates', label: language === 'pl' ? 'Ze współlokatorami' : 'With roommates' }
                    ].map((situation) => (
                      <button
                        key={situation.id}
                        onClick={() => setHouseholdData({ ...householdData, livingSituation: situation.id })}
                        className={`rounded-xl p-6 font-modern font-semibold transition-all duration-300 cursor-pointer group ${
                          householdData.livingSituation === situation.id
                            ? 'bg-gold/30 border-2 border-gold text-graphite shadow-lg'
                            : 'bg-white/10 border border-white/30 text-graphite hover:bg-gold/10 hover:border-gold/50 hover:text-gold-700'
                        }`}
                      >
                        {situation.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex justify-between">
                    <GlassButton onClick={() => setStep(1)} variant="secondary">
                      <ArrowLeft size={18} aria-hidden="true" />
                      {language === 'pl' ? 'Wstecz' : 'Back'}
                    </GlassButton>
                    <GlassButton 
                      onClick={() => setStep(householdData.livingSituation === 'alone' ? 3 : 3)}
                      disabled={!householdData.livingSituation}
                    >
                      {language === 'pl' ? 'Dalej' : 'Next'}
                      <ArrowRight size={18} />
                    </GlassButton>
                  </div>
                </GlassCard>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <GlassCard className="p-6 lg:p-8 min-h-[600px] max-h-[min(85vh,800px)] overflow-auto scrollbar-hide">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold to-champagne flex items-center justify-center">
                      <Target size={24} className="text-white" aria-hidden="true" />
                    </div>
                    <h1 className="text-2xl lg:text-3xl font-nasalization text-graphite">
                      {language === 'pl' ? 'Cele Przestrzeni' : 'Space Goals'}
                    </h1>
                  </div>

                  <p className="text-graphite font-modern mb-6">
                    {language === 'pl'
                      ? 'Co powinno wspierać to miejsce? (wybierz wszystkie które pasują)'
                      : 'What should this place support? (select all that apply)'}
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
                    {[
                      { id: 'connection', label: language === 'pl' ? 'Więź' : 'Connection' },
                      { id: 'independence', label: language === 'pl' ? 'Niezależność' : 'Independence' },
                      { id: 'productivity', label: language === 'pl' ? 'Produktywność' : 'Productivity' },
                      { id: 'relaxation', label: language === 'pl' ? 'Relaks' : 'Relaxation' },
                      { id: 'creativity', label: language === 'pl' ? 'Kreatywność' : 'Creativity' },
                      { id: 'entertaining', label: language === 'pl' ? 'Goszczenie' : 'Entertaining' },
                      { id: 'family_time', label: language === 'pl' ? 'Czas z rodziną' : 'Family time' },
                      { id: 'growth', label: language === 'pl' ? 'Rozwój' : 'Personal growth' }
                    ].map((goal) => {
                      const isSelected = householdData.goals.includes(goal.id);
                      return (
                        <button
                          key={goal.id}
                          onClick={() => {
                            const goals = isSelected
                              ? householdData.goals.filter(g => g !== goal.id)
                              : [...householdData.goals, goal.id];
                            setHouseholdData({ ...householdData, goals });
                          }}
                          className={`rounded-xl p-4 text-sm font-modern font-semibold transition-all duration-300 cursor-pointer group ${
                            isSelected
                              ? 'bg-gold/30 border-2 border-gold text-graphite shadow-lg'
                              : 'bg-white/10 border border-white/30 text-graphite hover:bg-gold/10 hover:border-gold/50 hover:text-gold-700 hover:scale-105'
                          }`}
                        >
                          {goal.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex justify-between">
                    <GlassButton onClick={() => setStep(2)} variant="secondary">
                      <ArrowLeft size={18} />
                      {language === 'pl' ? 'Wstecz' : 'Back'}
                    </GlassButton>
                    <GlassButton 
                      onClick={handleSubmit}
                      disabled={householdData.goals.length === 0 || isSaving}
                    >
                      {isSaving 
                        ? (language === 'pl' ? 'Zapisuję...' : 'Saving...')
                        : (language === 'pl' ? 'Zapisz i Dodaj Pokój' : 'Save & Add Room')
                      }
                      <ArrowRight size={18} aria-hidden="true" />
                    </GlassButton>
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

