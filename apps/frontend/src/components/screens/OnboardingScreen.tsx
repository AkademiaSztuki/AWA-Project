"use client";

import React, { useState } from 'react';
import { GlassCard, GlassButton } from '@/components/ui';
import { AwaContainer } from '@/components/awa/AwaContainer';
import { AwaDialogue } from '@/components/awa/AwaDialogue';
import { useRouter } from 'next/navigation';
import { useSessionData } from '@/hooks/useSessionData';
import { stopAllDialogueAudio } from '@/hooks/useAudioManager';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion } from 'framer-motion';

const OnboardingScreen: React.FC = () => {
  const router = useRouter();
  const { language, t } = useLanguage();
  const [step, setStep] = useState<'consent' | 'demographics'>('consent');
  const [demographics, setDemographics] = useState({
    ageRange: '',
    gender: '',
    education: ''
  });
  const { updateSessionData, sessionData } = useSessionData();

  const canProceedDemographics = demographics.ageRange && demographics.gender && demographics.education;

  const handleConsentSubmit = () => {
    console.log('[Onboarding] Consent submit clicked');
    console.log('[Onboarding] ✅ Moving to demographics step');
    setStep('demographics');
  };

  const handleDemographicsSubmit = async () => {
    if (canProceedDemographics) {
      stopAllDialogueAudio();
      await updateSessionData({
        consentTimestamp: new Date().toISOString(),
        demographics: demographics
      });
      
      // Check path type and route accordingly
      const pathType = (sessionData as any)?.pathType;
      console.log('[Onboarding] Demographics complete, pathType:', pathType);
      
      if (pathType === 'fast') {
        // Fast track: photo already uploaded, now go to style selection
        console.log('[Onboarding] Fast track - routing to style selection');
        router.push('/flow/style-selection');
      } else {
        // Full experience: go to core profile wizard
        console.log('[Onboarding] Routing to core profile');
        router.push('/setup/profile');
      }
    }
  };

  const consentTexts = {
    pl: {
      title: 'Zgoda na Udział w Badaniu',
      purpose: 'Cel Badania',
      purposeText: 'Badanie prowadzone przez Akademię Sztuk Pięknych ma na celu zbadanie, w jaki sposób interaktywny system AI wpływa na proces twórczy w projektowaniu wnętrz.',
      yourData: 'Twoje Dane',
      dataText: 'Wszystkie dane będą przetwarzane anonimowo. Zamiast danych osobowych używamy unikalnego, losowego identyfikatora. Dane będą wykorzystane wyłącznie do celów naukowych i nie będą udostępniane osobom trzecim.',
      collected: 'Co Będzie Zbierane?',
      agree: 'Wyrażam Zgodę Na:',
      consent1: 'Przetwarzanie moich danych w sposób anonimowy dla celów badawczych',
      consent2: 'Udział w badaniu naukowym Akademii Sztuk Pięknych',
      consent3: 'Rozumiem, że moje dane będą w pełni zanonimizowane',
      back: 'Wstecz',
      submit: 'Zgadzam się i Dalej'
    },
    en: {
      title: 'Research Participation Consent',
      purpose: 'Study Purpose',
      purposeText: 'This study conducted by the Academy of Fine Arts aims to investigate how interactive AI systems influence the creative process in interior design.',
      yourData: 'Your Data',
      dataText: 'All data will be processed anonymously. Instead of personal information, we use a unique, random identifier. Data will be used solely for scientific purposes and will not be shared with third parties.',
      collected: 'What Will Be Collected?',
      agree: 'I Consent To:',
      consent1: 'Processing my data anonymously for research purposes',
      consent2: 'Participation in the Academy of Fine Arts research study',
      consent3: 'I understand that my data will be fully anonymized',
      back: 'Back',
      submit: 'I Agree and Continue'
    }
  };

  const texts = consentTexts[language];

  return (
    <div className="min-h-screen flex flex-col w-full">
      {/* Formularz zgody/demographics */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl mx-auto">
          {step === 'consent' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <GlassCard className="p-6 md:p-8 max-h-[85vh] overflow-auto scrollbar-hide">
                <h1 className="text-xl md:text-2xl font-nasalization bg-gradient-to-r from-gold to-champagne bg-clip-text text-transparent mb-3">
                  {texts.title}
                </h1>

                <div className="space-y-3 text-graphite font-modern text-xs md:text-sm">
                  <div>
                    <h3 className="text-lg font-semibold text-gold mb-2">
                      {texts.purpose}
                    </h3>
                    <p>{texts.purposeText}</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gold mb-2">
                      {texts.yourData}
                    </h3>
                    <p>{texts.dataText}</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gold mb-2">
                      {texts.collected}
                    </h3>
                    <ul className="list-disc list-inside space-y-1">
                      <li>{language === 'pl' ? 'Twoje wybory i preferencje wizualne' : 'Your choices and visual preferences'}</li>
                      <li>{language === 'pl' ? 'Czasy reakcji i wzorce interakcji' : 'Reaction times and interaction patterns'}</li>
                      <li>{language === 'pl' ? 'Oceny i odpowiedzi na pytania' : 'Ratings and survey responses'}</li>
                      <li>{language === 'pl' ? 'Informacje o procesie projektowym' : 'Information about the design process'}</li>
                    </ul>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
                  <GlassButton
                    variant="secondary"
                    onClick={() => {
                      stopAllDialogueAudio();
                      router.push('/');
                    }}
                  >
                    ← {texts.back}
                  </GlassButton>

                  <GlassButton
                    onClick={handleConsentSubmit}
                    size="lg"
                  >
                    {texts.submit} →
                  </GlassButton>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {step === 'demographics' && (
            <DemographicsStep
              data={demographics}
              onUpdate={setDemographics}
              onBack={() => setStep('consent')}
              onSubmit={handleDemographicsSubmit}
              canProceed={canProceedDemographics}
            />
          )}
        </div>
      </div>

      {/* Dialog IDA na dole - cała szerokość */}
      <div className="w-full">
        <AwaDialogue 
          currentStep="onboarding" 
          fullWidth={true}
          autoHide={true}
        />
      </div>
    </div>
  );
};

// Demographics Step Component
function DemographicsStep({ data, onUpdate, onBack, onSubmit, canProceed }: any) {
  const { language } = useLanguage();

  const demographicsTexts = {
    pl: {
      title: 'Kilka Szybkich Pytań',
      subtitle: 'Pomogą nam lepiej zrozumieć różnorodność uczestników badania',
      age: 'Przedział wiekowy',
      gender: 'Płeć',
      education: 'Wykształcenie',
      back: 'Wstecz',
      continue: 'Kontynuuj'
    },
    en: {
      title: 'A Few Quick Questions',
      subtitle: 'Help us better understand the diversity of study participants',
      age: 'Age range',
      gender: 'Gender',
      education: 'Education level',
      back: 'Back',
      continue: 'Continue'
    }
  };

  const texts = demographicsTexts[language];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6 }}
    >
      <GlassCard className="p-6 md:p-8 max-h-[85vh] overflow-auto scrollbar-hide">
        <h2 className="text-xl md:text-2xl font-nasalization bg-gradient-to-r from-gold to-champagne bg-clip-text text-transparent mb-2">
          {texts.title}
        </h2>
        <p className="text-graphite font-modern mb-6 text-sm">
          {texts.subtitle}
        </p>

        <div className="space-y-5">
          {/* Age Range */}
          <div>
            <label className="block text-sm font-semibold text-graphite mb-2">
              {texts.age}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['18-24', '25-34', '35-44', '45-54', '55-64', '65+'].map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => onUpdate({ ...data, ageRange: range })}
                  className={`rounded-lg p-3 text-sm font-modern font-semibold transition-all duration-300 cursor-pointer group ${
                    data.ageRange === range
                      ? 'bg-gold/30 border-2 border-gold text-graphite shadow-lg'
                      : 'bg-white/10 border border-white/30 text-graphite hover:bg-gold/10 hover:border-gold/50 hover:text-gold-700'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm font-semibold text-graphite mb-2">
              {texts.gender}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'female', label: language === 'pl' ? 'Kobieta' : 'Female' },
                { id: 'male', label: language === 'pl' ? 'Mężczyzna' : 'Male' },
                { id: 'non-binary', label: language === 'pl' ? 'Niebinarna' : 'Non-binary' },
                { id: 'prefer-not-say', label: language === 'pl' ? 'Wolę nie mówić' : 'Prefer not to say' }
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onUpdate({ ...data, gender: option.id })}
                  className={`rounded-lg p-4 text-sm font-modern font-semibold transition-all duration-300 cursor-pointer group ${
                    data.gender === option.id
                      ? 'bg-gold/30 border-2 border-gold text-graphite shadow-lg'
                      : 'bg-white/10 border border-white/30 text-graphite hover:bg-gold/10 hover:border-gold/50 hover:text-gold-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Education */}
          <div>
            <label className="block text-sm font-semibold text-graphite mb-2">
              {texts.education}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'high-school', label: language === 'pl' ? 'Średnie' : 'High School' },
                { id: 'bachelor', label: language === 'pl' ? 'Licencjat' : 'Bachelor\'s' },
                { id: 'master', label: language === 'pl' ? 'Magister' : 'Master\'s' },
                { id: 'doctorate', label: language === 'pl' ? 'Doktorat' : 'Doctorate' }
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onUpdate({ ...data, education: option.id })}
                  className={`rounded-lg p-3 text-sm font-modern font-semibold transition-all duration-300 cursor-pointer group ${
                    data.education === option.id
                      ? 'bg-gold/30 border-2 border-gold text-graphite shadow-lg'
                      : 'bg-white/10 border border-white/30 text-graphite hover:bg-gold/10 hover:border-gold/50 hover:text-gold-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
          <GlassButton variant="secondary" onClick={onBack}>
            ← {texts.back}
          </GlassButton>

          <GlassButton
            disabled={!canProceed}
            onClick={onSubmit}
            size="lg"
          >
            {texts.continue} →
          </GlassButton>
        </div>
      </GlassCard>
    </motion.div>
  );
}

export default OnboardingScreen;