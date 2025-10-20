"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { AwaContainer } from '@/components/awa/AwaContainer';
import { Home, Users, Target, ArrowRight, ArrowLeft } from 'lucide-react';

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
  
  const [step, setStep] = useState(1);
  const [householdData, setHouseholdData] = useState<HouseholdData>({
    name: '',
    type: 'home',
    livingSituation: '',
    goals: []
  });

  const totalSteps = householdData.livingSituation === 'alone' ? 3 : 4;

  const handleSubmit = async () => {
    // TODO: Save to Supabase households table
    console.log('Saving household:', householdData);
    
    // Navigate to add first room
    router.push(`/setup/room/new-household-id`);
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
        <div className="max-w-3xl mx-auto">
          {/* Progress */}
          <div className="mb-8">
            <div className="flex items-center justify-between text-sm text-silver-dark mb-2 font-modern">
              <span>
                {language === 'pl' ? 'Krok' : 'Step'} {step} / {totalSteps}
              </span>
              <span>{Math.round((step / totalSteps) * 100)}%</span>
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
                <GlassCard className="p-6 lg:p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold to-champagne flex items-center justify-center">
                      <Home size={24} className="text-white" />
                    </div>
                    <h2 className="text-2xl lg:text-3xl font-nasalization text-graphite">
                      {language === 'pl' ? 'Nazwa Przestrzeni' : 'Space Name'}
                    </h2>
                  </div>

                  <p className="text-graphite font-modern mb-6">
                    {language === 'pl'
                      ? 'Jak nazwiemy tę przestrzeń?'
                      : 'What should we call this space?'}
                  </p>

                  <input
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
                      { id: 'home', label: language === 'pl' ? 'Dom/Mieszkanie' : 'Home/Apartment', icon: '🏠' },
                      { id: 'office', label: language === 'pl' ? 'Biuro' : 'Office', icon: '🏢' },
                      { id: 'vacation', label: language === 'pl' ? 'Dom wakacyjny' : 'Vacation Home', icon: '🏖️' },
                      { id: 'other', label: language === 'pl' ? 'Inne' : 'Other', icon: '✨' }
                    ].map((type) => (
                      <button
                        key={type.id}
                        onClick={() => setHouseholdData({ ...householdData, type: type.id })}
                        className={`glass-panel rounded-xl p-4 transition-all duration-300 ${
                          householdData.type === type.id
                            ? 'border-2 border-gold bg-gold/10'
                            : 'border border-white/30 hover:border-gold/30'
                        }`}
                      >
                        <div className="text-3xl mb-2">{type.icon}</div>
                        <p className="text-sm font-modern text-graphite">{type.label}</p>
                      </button>
                    ))}
                  </div>

                  <div className="flex justify-end">
                    <GlassButton 
                      onClick={() => setStep(2)}
                      disabled={!householdData.name.trim()}
                    >
                      {language === 'pl' ? 'Dalej' : 'Next'}
                      <ArrowRight size={18} className="ml-2" />
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
                <GlassCard className="p-6 lg:p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center">
                      <Users size={24} className="text-white" />
                    </div>
                    <h2 className="text-2xl lg:text-3xl font-nasalization text-graphite">
                      {language === 'pl' ? 'Kto Tu Mieszka?' : 'Who Lives Here?'}
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                    {[
                      { id: 'alone', label: language === 'pl' ? 'Sam/sama' : 'Alone', icon: '🧑' },
                      { id: 'partner', label: language === 'pl' ? 'Z partnerem/partnerką' : 'With partner', icon: '👫' },
                      { id: 'family', label: language === 'pl' ? 'Z rodziną' : 'With family', icon: '👨‍👩‍👧‍👦' },
                      { id: 'roommates', label: language === 'pl' ? 'Ze współlokatorami' : 'With roommates', icon: '👥' }
                    ].map((situation) => (
                      <button
                        key={situation.id}
                        onClick={() => setHouseholdData({ ...householdData, livingSituation: situation.id })}
                        className={`glass-panel rounded-xl p-6 transition-all duration-300 ${
                          householdData.livingSituation === situation.id
                            ? 'border-2 border-gold bg-gold/10'
                            : 'border border-white/30 hover:border-gold/30'
                        }`}
                      >
                        <div className="text-4xl mb-3">{situation.icon}</div>
                        <p className="font-modern text-graphite">{situation.label}</p>
                      </button>
                    ))}
                  </div>

                  <div className="flex justify-between">
                    <GlassButton onClick={() => setStep(1)} variant="secondary">
                      <ArrowLeft size={18} className="mr-2" />
                      {language === 'pl' ? 'Wstecz' : 'Back'}
                    </GlassButton>
                    <GlassButton 
                      onClick={() => setStep(householdData.livingSituation === 'alone' ? 3 : 3)}
                      disabled={!householdData.livingSituation}
                    >
                      {language === 'pl' ? 'Dalej' : 'Next'}
                      <ArrowRight size={18} className="ml-2" />
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
                <GlassCard className="p-6 lg:p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center">
                      <Target size={24} className="text-white" />
                    </div>
                    <h2 className="text-2xl lg:text-3xl font-nasalization text-graphite">
                      {language === 'pl' ? 'Cele Przestrzeni' : 'Space Goals'}
                    </h2>
                  </div>

                  <p className="text-graphite font-modern mb-6">
                    {language === 'pl'
                      ? 'Co powinno wspierać to miejsce? (wybierz wszystkie które pasują)'
                      : 'What should this place support? (select all that apply)'}
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
                    {[
                      { id: 'connection', label: language === 'pl' ? 'Więź' : 'Connection', icon: '❤️' },
                      { id: 'independence', label: language === 'pl' ? 'Niezależność' : 'Independence', icon: '🦅' },
                      { id: 'productivity', label: language === 'pl' ? 'Produktywność' : 'Productivity', icon: '⚡' },
                      { id: 'relaxation', label: language === 'pl' ? 'Relaks' : 'Relaxation', icon: '😌' },
                      { id: 'creativity', label: language === 'pl' ? 'Kreatywność' : 'Creativity', icon: '🎨' },
                      { id: 'entertaining', label: language === 'pl' ? 'Goszczenie' : 'Entertaining', icon: '🎉' },
                      { id: 'family_time', label: language === 'pl' ? 'Czas z rodziną' : 'Family time', icon: '👨‍👩‍👧' },
                      { id: 'growth', label: language === 'pl' ? 'Rozwój' : 'Personal growth', icon: '🌱' }
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
                          className={`glass-panel rounded-xl p-4 transition-all duration-300 ${
                            isSelected
                              ? 'border-2 border-gold bg-gold/10 scale-105'
                              : 'border border-white/30 hover:border-gold/30 hover:scale-105'
                          }`}
                        >
                          <div className="text-3xl mb-2">{goal.icon}</div>
                          <p className="text-xs font-modern text-graphite">{goal.label}</p>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex justify-between">
                    <GlassButton onClick={() => setStep(2)} variant="secondary">
                      <ArrowLeft size={18} className="mr-2" />
                      {language === 'pl' ? 'Wstecz' : 'Back'}
                    </GlassButton>
                    <GlassButton 
                      onClick={handleSubmit}
                      disabled={householdData.goals.length === 0}
                    >
                      {language === 'pl' ? 'Zapisz i Dodaj Pokój' : 'Save & Add Room'}
                      <ArrowRight size={18} className="ml-2" />
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

