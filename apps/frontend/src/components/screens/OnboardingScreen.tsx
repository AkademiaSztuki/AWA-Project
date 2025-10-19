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
  const [consent, setConsent] = useState({
    dataProcessing: false,
    research: false,
    anonymity: false
  });
  const [demographics, setDemographics] = useState({
    ageRange: '',
    gender: '',
    education: ''
  });
  const { updateSessionData, sessionData } = useSessionData();

  const canProceedConsent = Object.values(consent).every(Boolean);
  const canProceedDemographics = demographics.ageRange && demographics.gender && demographics.education;

  const handleConsentSubmit = () => {
    if (canProceedConsent) {
      setStep('demographics');
    }
  };

  const handleDemographicsSubmit = () => {
    if (canProceedDemographics) {
      stopAllDialogueAudio();
      updateSessionData({
        consentTimestamp: new Date().toISOString(),
        demographics: demographics
      });
      
      // Check path type and route accordingly
      const pathType = (sessionData as any)?.pathType;
      console.log('[Onboarding] Demographics complete, pathType:', pathType);
      
      if (pathType === 'fast') {
        // Fast track: skip core profile, go directly to photo upload with skip flag
        console.log('[Onboarding] Routing to photo with skipFlow flag');
        router.push('/flow/photo?skipFlow=true');
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
    <div className="min-h-screen flex w-full relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-radial from-pearl-50 via-platinum-50 to-silver-100 -z-10" />

      {/* IDA model on the right side */}
      <AwaContainer 
        currentStep="onboarding" 
        showDialogue={false}
        fullWidth={false}
        autoHide={false}
      />

      <div className="flex-1 flex items-center p-4 lg:p-8 lg:mr-32">
        <div className="w-full max-w-4xl mx-auto">
          {step === 'consent' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <GlassCard className="mb-8">
                <h1 className="text-2xl lg:text-3xl xl:text-4xl 2xl:text-5xl font-nasalization bg-gradient-to-r from-gold to-champagne bg-clip-text text-transparent mb-4 lg:mb-6">
                  {texts.title}
                </h1>

                <div className="space-y-4 lg:space-y-6 text-graphite font-modern text-sm lg:text-base xl:text-lg">
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
              </GlassCard>

              <GlassCard variant="highlighted">
                <h3 className="text-lg lg:text-xl xl:text-2xl font-nasalization text-gold mb-3 lg:mb-4">
                  {texts.agree}
                </h3>

                <div className="space-y-3 lg:space-y-4">
                  {[
                    { key: 'dataProcessing', text: texts.consent1 },
                    { key: 'research', text: texts.consent2 },
                    { key: 'anonymity', text: texts.consent3 }
                  ].map(({ key, text }) => (
                    <label key={key} className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={consent[key as keyof typeof consent]}
                        onChange={(e) => setConsent(prev => ({
                          ...prev,
                          [key]: e.target.checked
                        }))}
                        className="mt-1 w-5 h-5 text-gold-600 bg-pearl-100/20 border-gold-400/50 rounded focus:ring-gold-500 focus:ring-2"
                      />
                      <span className="text-graphite font-modern group-hover:text-gold transition-colors">{text}</span>
                    </label>
                  ))}
                </div>

                <div className="flex justify-between items-center mt-8">
                  <GlassButton
                    variant="secondary"
                    onClick={() => {
                      stopAllDialogueAudio();
                      router.push('/');
                    }}
                  >
                    {texts.back}
                  </GlassButton>

                  <GlassButton
                    disabled={!canProceedConsent}
                    onClick={handleConsentSubmit}
                    size="lg"
                  >
                    {texts.submit}
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
      <GlassCard className="p-6 lg:p-8">
        <h2 className="text-2xl lg:text-3xl xl:text-4xl font-nasalization bg-gradient-to-r from-gold to-champagne bg-clip-text text-transparent mb-3">
          {texts.title}
        </h2>
        <p className="text-graphite font-modern mb-8">
          {texts.subtitle}
        </p>

        <div className="space-y-6">
          {/* Age Range */}
          <div>
            <label className="block text-sm font-semibold text-graphite mb-3">
              {texts.age}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {['18-24', '25-34', '35-44', '45-54', '55-64', '65+'].map((range) => (
                <button
                  key={range}
                  onClick={() => onUpdate({ ...data, ageRange: range })}
                  className={`glass-panel rounded-xl p-3 transition-all duration-300 ${
                    data.ageRange === range
                      ? 'border-2 border-gold bg-gold/10'
                      : 'border border-white/30 hover:border-gold/30'
                  }`}
                >
                  <p className="text-sm font-modern text-graphite">{range}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm font-semibold text-graphite mb-3">
              {texts.gender}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: 'female', label: language === 'pl' ? 'Kobieta' : 'Female', icon: '👩' },
                { id: 'male', label: language === 'pl' ? 'Mężczyzna' : 'Male', icon: '👨' },
                { id: 'non-binary', label: language === 'pl' ? 'Niebinarna' : 'Non-binary', icon: '🧑' },
                { id: 'prefer-not-say', label: language === 'pl' ? 'Wolę nie mówić' : 'Prefer not to say', icon: '✨' }
              ].map((option) => (
                <button
                  key={option.id}
                  onClick={() => onUpdate({ ...data, gender: option.id })}
                  className={`glass-panel rounded-xl p-4 transition-all duration-300 ${
                    data.gender === option.id
                      ? 'border-2 border-gold bg-gold/10'
                      : 'border border-white/30 hover:border-gold/30'
                  }`}
                >
                  <div className="text-2xl mb-2">{option.icon}</div>
                  <p className="text-xs font-modern text-graphite">{option.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Education */}
          <div>
            <label className="block text-sm font-semibold text-graphite mb-3">
              {texts.education}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { id: 'high-school', label: language === 'pl' ? 'Średnie' : 'High School' },
                { id: 'bachelor', label: language === 'pl' ? 'Licencjat' : 'Bachelor\'s' },
                { id: 'master', label: language === 'pl' ? 'Magister' : 'Master\'s' },
                { id: 'doctorate', label: language === 'pl' ? 'Doktorat' : 'Doctorate' }
              ].map((option) => (
                <button
                  key={option.id}
                  onClick={() => onUpdate({ ...data, education: option.id })}
                  className={`glass-panel rounded-xl p-3 transition-all duration-300 ${
                    data.education === option.id
                      ? 'border-2 border-gold bg-gold/10'
                      : 'border border-white/30 hover:border-gold/30'
                  }`}
                >
                  <p className="text-sm font-modern text-graphite">{option.label}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mt-8">
          <GlassButton variant="secondary" onClick={onBack}>
            {texts.back}
          </GlassButton>

          <GlassButton
            disabled={!canProceed}
            onClick={onSubmit}
            size="lg"
          >
            {texts.continue}
          </GlassButton>
        </div>
      </GlassCard>
    </motion.div>
  );
}

export default OnboardingScreen;