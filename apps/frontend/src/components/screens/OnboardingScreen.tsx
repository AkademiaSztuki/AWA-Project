"use client";

import React, { useEffect, useState } from 'react';
import { GlassCard, GlassButton, GlassAccordion } from '@/components/ui';
import { AwaDialogue } from '@/components/awa/AwaDialogue';
import { useRouter } from 'next/navigation';
import { useSessionData } from '@/hooks/useSessionData';
import { stopAllDialogueAudio } from '@/hooks/useAudioManager';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { saveResearchConsent } from '@/lib/supabase';
import { ChevronDown } from 'lucide-react';

const getDefaultCountry = (language: 'pl' | 'en') => (language === 'pl' ? 'PL' : 'US');
const COUNTRY_OPTIONS = [
  { code: 'PL', label: { pl: 'Polska', en: 'Poland' } },
  { code: 'DE', label: { pl: 'Niemcy', en: 'Germany' } },
  { code: 'CZ', label: { pl: 'Czechy', en: 'Czech Republic' } },
  { code: 'SK', label: { pl: 'Słowacja', en: 'Slovakia' } },
  { code: 'UA', label: { pl: 'Ukraina', en: 'Ukraine' } },
  { code: 'GB', label: { pl: 'Wielka Brytania', en: 'United Kingdom' } },
  { code: 'IE', label: { pl: 'Irlandia', en: 'Ireland' } },
  { code: 'SE', label: { pl: 'Szwecja', en: 'Sweden' } },
  { code: 'NO', label: { pl: 'Norwegia', en: 'Norway' } },
  { code: 'FI', label: { pl: 'Finlandia', en: 'Finland' } },
  { code: 'DK', label: { pl: 'Dania', en: 'Denmark' } },
  { code: 'FR', label: { pl: 'Francja', en: 'France' } },
  { code: 'ES', label: { pl: 'Hiszpania', en: 'Spain' } },
  { code: 'PT', label: { pl: 'Portugalia', en: 'Portugal' } },
  { code: 'IT', label: { pl: 'Włochy', en: 'Italy' } },
  { code: 'NL', label: { pl: 'Holandia', en: 'Netherlands' } },
  { code: 'BE', label: { pl: 'Belgia', en: 'Belgium' } },
  { code: 'AT', label: { pl: 'Austria', en: 'Austria' } },
  { code: 'CH', label: { pl: 'Szwajcaria', en: 'Switzerland' } },
  { code: 'LT', label: { pl: 'Litwa', en: 'Lithuania' } },
  { code: 'LV', label: { pl: 'Łotwa', en: 'Latvia' } },
  { code: 'EE', label: { pl: 'Estonia', en: 'Estonia' } },
  { code: 'US', label: { pl: 'Stany Zjednoczone', en: 'United States' } },
  { code: 'CA', label: { pl: 'Kanada', en: 'Canada' } },
  { code: 'AU', label: { pl: 'Australia', en: 'Australia' } },
  { code: 'NZ', label: { pl: 'Nowa Zelandia', en: 'New Zealand' } },
  { code: 'RO', label: { pl: 'Rumunia', en: 'Romania' } },
  { code: 'HU', label: { pl: 'Węgry', en: 'Hungary' } },
  { code: 'HR', label: { pl: 'Chorwacja', en: 'Croatia' } },
  { code: 'SI', label: { pl: 'Słowenia', en: 'Slovenia' } },
  { code: 'BG', label: { pl: 'Bułgaria', en: 'Bulgaria' } },
  { code: 'GR', label: { pl: 'Grecja', en: 'Greece' } },
];

function CountrySelect({
  value,
  onChange,
  language
}: {
  value: string;
  onChange: (code: string) => void;
  language: 'pl' | 'en';
}) {
  const [open, setOpen] = useState(false);
  const selectedLabel = COUNTRY_OPTIONS.find((option) => option.code === value)?.label[language] ?? value;

  return (
    <div className="relative" tabIndex={0} onBlur={() => setOpen(false)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full rounded-lg border border-gold/60 bg-gradient-to-r from-gold/55 via-champagne/50 to-gold/35 p-3 text-sm font-modern text-graphite flex items-center justify-between focus:border-gold focus:outline-none backdrop-blur-lg shadow-sm"
      >
        <span>{selectedLabel}</span>
        <span className="text-graphite/70">▾</span>
      </button>

      {open && (
        <div className="absolute z-40 bottom-full mb-3 max-h-64 w-full overflow-auto rounded-xl border border-white/25 bg-[#c7b07a] shadow-2xl ring-1 ring-gold/35 backdrop-blur-sm">
          <ul className="py-1 space-y-0.5">
            {COUNTRY_OPTIONS.map((option) => (
              <li key={option.code}>
                <button
                  type="button"
                  className={`w-full text-left px-4 py-2 text-sm font-modern rounded-lg transition ${
                    value === option.code
                      ? 'bg-gold/80 text-white font-semibold shadow-inner drop-shadow-sm'
                      : 'text-graphite/90 hover:bg-gold/70 hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.55)]'
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(option.code);
                    setOpen(false);
                  }}
                >
                  {option.label[language]}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

const OnboardingScreen: React.FC = () => {
  const router = useRouter();
  const { language, t } = useLanguage();
  const [step, setStep] = useState<'consent' | 'demographics'>('consent');
  const [consentState, setConsentState] = useState({
    consentResearch: false,
    consentProcessing: false,
    acknowledgedArt13: false
  });
  const [showLearnMore, setShowLearnMore] = useState(false);
  const [demographics, setDemographics] = useState({
    ageRange: '',
    gender: '',
    education: '',
    country: getDefaultCountry(language)
  });
  const { updateSessionData, sessionData, isInitialized } = useSessionData();
  const pathType = sessionData?.pathType;
  const isFastTrack = pathType === 'fast';

  useEffect(() => {
    setDemographics((prev) => ({
      ...prev,
      country: prev.country || getDefaultCountry(language)
    }));
  }, [language]);

  useEffect(() => {
    // Redirect immediately when pathType is available - don't wait for full sessionData
    if (pathType === 'full') {
      router.replace('/setup/profile');
    }
  }, [pathType, router]);

  const canProceedDemographics = demographics.ageRange && demographics.gender && demographics.education && demographics.country;
  const canProceedConsent = consentState.consentResearch && consentState.consentProcessing && consentState.acknowledgedArt13;

  const handleConsentSubmit = async () => {
    if (!canProceedConsent) return;
    
    console.log('[Onboarding] Consent submit clicked');
    
    // Zapis zgody do bazy
    const userHash = sessionData?.userHash;
    if (userHash) {
      try {
        const consentData = await saveResearchConsent(
          userHash,
          {
            consentResearch: consentState.consentResearch,
            consentProcessing: consentState.consentProcessing,
            acknowledgedArt13: consentState.acknowledgedArt13
          },
          language
        );
        
        if (consentData) {
          console.log('[Onboarding] ✅ Consent saved to database:', consentData.id);
        } else {
          console.warn('[Onboarding] ⚠️ Failed to save consent to database');
        }
      } catch (error) {
        console.error('[Onboarding] ❌ Error saving consent:', error);
      }
    } else {
      console.warn('[Onboarding] ⚠️ No userHash available, skipping consent save');
    }
    
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
      console.log('[Onboarding] Demographics complete');
      console.log('[Onboarding] pathType:', pathType);
      console.log('[Onboarding] pathType === "fast":', pathType === 'fast');
      console.log('[Onboarding] Full sessionData:', sessionData);
      
      if (pathType === 'fast') {
        console.log('[Onboarding] ⚡ FAST TRACK - routing to photo upload');
        router.push('/flow/fast-track');
      } else {
        // Full experience: go to setup/profile (CoreProfileWizard) first
        console.log('[Onboarding] 🌟 FULL EXPERIENCE - routing to setup/profile');
        router.push('/setup/profile');
      }
    }
  };

  const consentTexts = {
    pl: {
      title: 'Zgoda na udział w badaniu',
      administrator: 'Administrator danych',
      administratorText: 'Jakub Palka, kontakt: jakub.palka@akademiasztuki.eu',
      purpose: 'Cel',
      purposeText: 'Badanie analizuje, jak interaktywny system AI wpływa na proces twórczy w projektowaniu wnętrz; wyniki opracowywane statystycznie i publikowane zbiorczo.',
      scope: 'Zakres danych',
      scopeText: 'Dane konta (e-mail), odpowiedzi i wyniki testów, preferencje i interakcje (np. czasy reakcji), przesłane zdjęcia wnętrz oraz dane techniczne/analityczne działania serwisu.',
      voluntary: 'Dobrowolność',
      voluntaryText: 'Udział jest dobrowolny; można przerwać i wycofać zgodę w dowolnym momencie poprzez e-mail.',
      rights: 'Prawa',
      rightsText: 'Prawa z RODO + prawo skargi do Prezesa UODO (szczegóły w Polityce prywatności).',
      photos: 'Zdjęcia',
      photosText: 'Przesyłaj tylko zdjęcia wnętrz; nie przesyłaj zdjęć osób, dokumentów ani danych wrażliwych.',
      acceptAll: 'Akceptuję wszystkie warunki i wyrażam zgodę',
      consent1: 'Zgoda na udział w badaniu',
      consent2: 'Zgoda na przetwarzanie danych osobowych',
      consent3: 'Zapoznałem się z informacją (art. 13 RODO)',
      consentNote: 'Zgodę możesz wycofać w dowolnym momencie, kontaktując się mailowo.',
      learnMore: 'Dowiedz się więcej',
      accordion1Title: 'Podstawa prawna i profilowanie',
      accordion1Content: 'Podstawa: zgoda. System analizuje odpowiedzi i zachowania w celu personalizacji wyników/generacji (profilowanie w celach badawczych/personalizacji).',
      accordion2Title: 'Jakie dane zbieramy',
      accordion2Content: 'Konto: e-mail + identyfikator użytkownika. Badawcze: wyniki testów, odpowiedzi, czasy reakcji, metadane interakcji. Techniczne/analityczne: dane o urządzeniu/przeglądarce + dane analityczne (Vercel).',
      accordion3Title: 'Narzędzia i odbiorcy danych',
      accordion3Content: 'Dane mogą być przetwarzane przez dostawców infrastruktury niezbędnych do działania usługi: Vercel (hosting/analityka), Supabase (auth/db/storage), Modal, Google Cloud, Stripe (płatności jeśli dotyczy).',
      accordion4Title: 'Jak długo przechowujemy dane',
      accordion4Content: 'Na czas realizacji badań + okres niezbędny do archiwizacji danych badawczych; konto do czasu usunięcia konta/wycofania zgody (z zastrzeżeniem obowiązków prawnych).',
      accordion5Title: 'Twoje prawa',
      accordion5Content: 'Dostęp, sprostowanie, usunięcie, ograniczenie, skarga do UODO; realizacja praw przez e-mail.',
      privacy: 'Polityka prywatności',
      terms: 'Regulamin',
      contact: 'Kontakt',
      back: 'Wstecz',
      submit: 'Dalej'
    },
    en: {
      title: 'Research Participation Consent',
      administrator: 'Data Administrator',
      administratorText: 'Jakub Palka, contact: jakub.palka@akademiasztuki.eu',
      purpose: 'Purpose',
      purposeText: 'The study analyzes how an interactive AI system influences the creative process in interior design; results are processed statistically and published collectively.',
      scope: 'Data Scope',
      scopeText: 'Account data (email), test responses and results, preferences and interactions (e.g., reaction times), uploaded interior photos, and technical/analytical service operation data.',
      voluntary: 'Voluntary Participation',
      voluntaryText: 'Participation is voluntary; you can stop and withdraw consent at any time via email.',
      rights: 'Rights',
      rightsText: 'GDPR rights + right to file a complaint with the Data Protection Authority (details in Privacy Policy).',
      photos: 'Photos',
      photosText: 'Upload only interior photos; do not upload photos of people, documents, or sensitive data.',
      acceptAll: 'I accept all terms and give consent',
      consent1: 'Consent to participate in study',
      consent2: 'Consent to personal data processing',
      consent3: 'I have read the information (Article 13 GDPR)',
      consentNote: 'You can withdraw your consent at any time by contacting us via email.',
      learnMore: 'Learn more',
      accordion1Title: 'Legal Basis and Profiling',
      accordion1Content: 'Basis: consent. The system analyzes responses and behaviors to personalize results/generation (profiling for research/personalization purposes).',
      accordion2Title: 'What Data We Collect',
      accordion2Content: 'Account: email + user identifier. Research: test results, responses, reaction times, interaction metadata. Technical/analytical: device/browser data + analytical data (Vercel).',
      accordion3Title: 'Tools and Data Recipients',
      accordion3Content: 'Data may be processed by infrastructure providers necessary for service operation: Vercel (hosting/analytics), Supabase (auth/db/storage), Modal, Google Cloud, Stripe (payments if applicable).',
      accordion4Title: 'Data Retention Period',
      accordion4Content: 'For the duration of the study + period necessary for research data archiving; account until account deletion/consent withdrawal (subject to legal obligations).',
      accordion5Title: 'Your Rights',
      accordion5Content: 'Access, rectification, deletion, restriction, complaint to Data Protection Authority; rights exercised via email.',
      privacy: 'Privacy Policy',
      terms: 'Terms of Service',
      contact: 'Contact',
      back: 'Back',
      submit: 'Continue'
    }
  };

  const texts = consentTexts[language];

  // Always render form immediately - no loading screens or white flashes
  // Redirect for full track happens in useEffect above
  // If pathType is missing, form will still render (user can go back manually if needed)

  return (
    <div className="min-h-screen flex flex-col w-full">
      {/* Formularz zgody/demographics */}
      <div className="flex-1 p-4 lg:p-8 pb-32">
        <div className="w-full max-w-4xl mx-auto pt-8">
          {step === 'consent' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <GlassCard className="p-6 md:p-8 max-h-[85vh] overflow-auto scrollbar-hide">
                <h1 className="text-xl md:text-2xl font-nasalization text-graphite drop-shadow-sm mb-4">
                  {texts.title}
                </h1>

                {/* Warstwa 1: Krótkie bloki informacyjne */}
                <div className="space-y-2 text-graphite font-modern text-xs mb-4">
                  <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                    <h3 className="text-gold font-semibold mb-1 text-xs uppercase tracking-wide">
                      {texts.administrator}
                    </h3>
                    <p className="leading-snug">{texts.administratorText}</p>
                  </div>

                  <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                    <h3 className="text-gold font-semibold mb-1 text-xs uppercase tracking-wide">
                      {texts.purpose}
                    </h3>
                    <p className="leading-snug">{texts.purposeText}</p>
                  </div>

                  <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                    <h3 className="text-gold font-semibold mb-1 text-xs uppercase tracking-wide">
                      {texts.scope}
                    </h3>
                    <p className="leading-snug">{texts.scopeText}</p>
                  </div>

                  <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                    <h3 className="text-gold font-semibold mb-1 text-xs uppercase tracking-wide">
                      {texts.voluntary}
                    </h3>
                    <p className="leading-snug">{texts.voluntaryText}</p>
                  </div>

                  <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                    <h3 className="text-gold font-semibold mb-1 text-xs uppercase tracking-wide">
                      {texts.rights}
                    </h3>
                    <p className="leading-snug">{texts.rightsText}</p>
                  </div>

                  <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                    <h3 className="text-gold font-semibold mb-1 text-xs uppercase tracking-wide">
                      {texts.photos}
                    </h3>
                    <p className="leading-snug">{texts.photosText}</p>
                  </div>
                </div>

                {/* Główny checkbox "Akceptuję wszystkie" */}
                <div className="mb-4 pb-4 border-b border-white/20">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={consentState.consentResearch && consentState.consentProcessing && consentState.acknowledgedArt13}
                        onChange={(e) => {
                          const allChecked = e.target.checked;
                          setConsentState({
                            consentResearch: allChecked,
                            consentProcessing: allChecked,
                            acknowledgedArt13: allChecked
                          });
                        }}
                        className="w-5 h-5 rounded border-2 border-gold/60 bg-white/10 backdrop-blur-sm text-gold focus:ring-2 focus:ring-gold focus:ring-offset-1 focus:ring-offset-transparent cursor-pointer transition-all appearance-none checked:bg-gold/40 checked:border-gold relative z-10"
                      />
                      {consentState.consentResearch && consentState.consentProcessing && consentState.acknowledgedArt13 && (
                        <svg className="absolute top-0.5 left-0.5 w-4 h-4 text-graphite pointer-events-none z-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-graphite font-modern flex-1 group-hover:text-gold transition-colors">
                      {texts.acceptAll}
                    </span>
                  </label>
                </div>

                {/* Szczegółowe checkboxy (opcjonalne, można je rozwinąć) */}
                <details className="mb-4">
                  <summary className="text-xs text-silver-dark font-modern cursor-pointer hover:text-gold transition-colors mb-2">
                    {language === 'pl' ? 'Szczegóły zgód' : 'Consent details'}
                  </summary>
                  <div className="space-y-2.5 mt-3 pl-2 border-l-2 border-gold/20">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={consentState.consentResearch}
                          onChange={(e) => setConsentState({ ...consentState, consentResearch: e.target.checked })}
                          className="w-4 h-4 rounded border-2 border-gold/60 bg-white/10 backdrop-blur-sm text-gold focus:ring-2 focus:ring-gold focus:ring-offset-1 focus:ring-offset-transparent cursor-pointer transition-all appearance-none checked:bg-gold/40 checked:border-gold relative z-10"
                        />
                        {consentState.consentResearch && (
                          <svg className="absolute top-0 left-0 w-4 h-4 text-graphite pointer-events-none z-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="text-xs text-graphite font-modern flex-1">
                        {texts.consent1}
                      </span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={consentState.consentProcessing}
                          onChange={(e) => setConsentState({ ...consentState, consentProcessing: e.target.checked })}
                          className="w-4 h-4 rounded border-2 border-gold/60 bg-white/10 backdrop-blur-sm text-gold focus:ring-2 focus:ring-gold focus:ring-offset-1 focus:ring-offset-transparent cursor-pointer transition-all appearance-none checked:bg-gold/40 checked:border-gold relative z-10"
                        />
                        {consentState.consentProcessing && (
                          <svg className="absolute top-0 left-0 w-4 h-4 text-graphite pointer-events-none z-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="text-xs text-graphite font-modern flex-1">
                        {texts.consent2}
                      </span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={consentState.acknowledgedArt13}
                          onChange={(e) => setConsentState({ ...consentState, acknowledgedArt13: e.target.checked })}
                          className="w-4 h-4 rounded border-2 border-gold/60 bg-white/10 backdrop-blur-sm text-gold focus:ring-2 focus:ring-gold focus:ring-offset-1 focus:ring-offset-transparent cursor-pointer transition-all appearance-none checked:bg-gold/40 checked:border-gold relative z-10"
                        />
                        {consentState.acknowledgedArt13 && (
                          <svg className="absolute top-0 left-0 w-4 h-4 text-graphite pointer-events-none z-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="text-xs text-graphite font-modern flex-1">
                        {texts.consent3}
                      </span>
                    </label>
                  </div>
                </details>

                <p className="text-xs text-silver-dark font-modern mb-4 italic">
                  {texts.consentNote}
                </p>

                {/* Przycisk "Dowiedz się więcej" ze strzałką */}
                <div className="rounded-xl overflow-hidden mb-3 bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl">
                  <button
                    type="button"
                    onClick={() => setShowLearnMore(!showLearnMore)}
                    className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
                  >
                    <span className="text-sm font-semibold text-graphite font-modern">
                      {texts.learnMore}
                    </span>
                    <ChevronDown
                      size={20}
                      className={`text-gold transition-transform duration-200 ${showLearnMore ? 'rotate-180' : ''}`}
                    />
                  </button>
                </div>

                {/* Akordeony "Dowiedz się więcej" - pokazują się po kliknięciu */}
                {showLearnMore && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-3 mb-6 overflow-hidden"
                  >
                    <GlassAccordion title={texts.accordion1Title}>
                      <p>{texts.accordion1Content}</p>
                    </GlassAccordion>

                    <GlassAccordion title={texts.accordion2Title}>
                      <p>{texts.accordion2Content}</p>
                    </GlassAccordion>

                    <GlassAccordion title={texts.accordion3Title}>
                      <p>{texts.accordion3Content}</p>
                    </GlassAccordion>

                    <GlassAccordion title={texts.accordion4Title}>
                      <p>{texts.accordion4Content}</p>
                    </GlassAccordion>

                    <GlassAccordion title={texts.accordion5Title}>
                      <p>{texts.accordion5Content}</p>
                    </GlassAccordion>
                  </motion.div>
                )}

                {/* Linki na dole */}
                <div className="flex flex-wrap gap-4 justify-center text-xs text-gold font-modern mb-6 border-t border-white/20 pt-4">
                  <Link href="/privacy" className="hover:text-champagne transition-colors underline">
                    {texts.privacy}
                  </Link>
                  <Link href="/terms" className="hover:text-champagne transition-colors underline">
                    {texts.terms}
                  </Link>
                  <a href="mailto:jakub.palka@akademiasztuki.eu" className="hover:text-champagne transition-colors underline">
                    {texts.contact}
                  </a>
                </div>
                
                {/* Przyciski */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
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
                    disabled={!canProceedConsent}
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
      country: 'Kraj zamieszkania',
      back: 'Wstecz',
      continue: 'Kontynuuj'
    },
    en: {
      title: 'A Few Quick Questions',
      subtitle: 'Help us better understand the diversity of study participants',
      age: 'Age range',
      gender: 'Gender',
      education: 'Education level',
      country: 'Country of residence',
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
        <h2 className="text-xl md:text-2xl font-nasalization text-graphite drop-shadow-sm mb-2">
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

          {/* Country */}
          <div>
            <label className="block text-sm font-semibold text-graphite mb-2">
              {texts.country}
            </label>
            <CountrySelect
              value={data.country}
              onChange={(code) => onUpdate({ ...data, country: code })}
              language={language}
            />
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