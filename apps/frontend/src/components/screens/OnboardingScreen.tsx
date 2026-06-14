"use client";

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { GlassCard, GlassButton } from '@/components/ui';
import { AwaDialogue } from '@/components/awa/AwaDialogue';
import { useRouter } from 'next/navigation';
import { useSessionData } from '@/hooks/useSessionData';
import { getSessionStoreSnapshot } from '@/hooks/useSession';
import { stopAllDialogueAudio } from '@/hooks/useAudioManager';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { saveResearchConsent, safeSessionStorage } from '@/lib/gcp-data';
import { initAnonSessionAfterConsent } from '@/lib/anon-session-client';
import { ChevronDown } from 'lucide-react';
import {
  FLOW_WIZARD_PAGE_SHELL,
  GLASS_CARD_DESKTOP_GROW_STEP,
} from '@/lib/flow/glass-step-layout';
import OnboardingDemographicsStep, {
  type OnboardingDemographicsData,
} from '@/components/screens/OnboardingDemographicsStep';

const OnboardingConsentLearnMore = dynamic(
  () => import('@/components/screens/OnboardingConsentLearnMore'),
  { ssr: false }
);

const getDefaultCountry = (language: 'pl' | 'en') => (language === 'pl' ? 'PL' : 'US');

const OnboardingScreen: React.FC = () => {
  const router = useRouter();
  const { language } = useLanguage();
  const [step, setStep] = useState<'consent' | 'demographics'>('consent');
  const [consentState, setConsentState] = useState({
    consentResearch: false,
    consentProcessing: false,
    acknowledgedArt13: false
  });
  const [showLearnMore, setShowLearnMore] = useState(false);
  const [demographics, setDemographics] = useState<OnboardingDemographicsData>({
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

  // Apply path_type from sessionStorage after login redirect (set by PathSelectionScreen).
  // Wait for session hydration so we do not clear aura_auth_path_type before pathType can merge from localStorage.
  useEffect(() => {
    if (!isInitialized) return;
    const stored = safeSessionStorage.getItem('aura_auth_path_type');
    if (!stored) return;
    if (sessionData?.pathType) {
      safeSessionStorage.removeItem('aura_auth_path_type');
      return;
    }
    if (stored === 'fast') {
      safeSessionStorage.removeItem('aura_auth_path_type');
      updateSessionData({ pathType: 'fast', currentStep: 'onboarding' });
    } else if (stored === 'full') {
      safeSessionStorage.removeItem('aura_auth_path_type');
      updateSessionData({ pathType: 'full' });
    }
  }, [isInitialized, sessionData?.pathType, updateSessionData]);

  useEffect(() => {
    // Redirect immediately when pathType is available - don't wait for full sessionData
    if (pathType === 'full') {
      router.replace('/setup/profile');
    }
  }, [pathType, router]);

  // Skip consent step if already completed
  useEffect(() => {
    if (isInitialized && step === 'consent') {
      const hasConsent = !!sessionData?.consentTimestamp;
      if (hasConsent) {
        console.log('[Onboarding] Consent already given, skipping to demographics');
        setStep('demographics');
      }
    }
  }, [isInitialized, sessionData, step]);

  // Restore demographics from session when returning to this screen (e.g. Wstecz z fast-track).
  // Local state starts empty on mount; without hydration „Kontynuuj” stays disabled.
  useEffect(() => {
    if (!isInitialized || step !== 'demographics') return;
    const d = sessionData?.demographics;
    if (!d || typeof d !== 'object') return;
    setDemographics((prev) => {
      if (prev.ageRange || prev.gender || prev.education) return prev;
      return {
        ageRange: typeof d.ageRange === 'string' ? d.ageRange : '',
        gender: typeof d.gender === 'string' ? d.gender : '',
        education: typeof d.education === 'string' ? d.education : '',
        country:
          typeof d.country === 'string' && d.country.trim()
            ? d.country
            : getDefaultCountry(language),
      };
    });
  }, [isInitialized, step, sessionData?.demographics, language]);

  const canProceedDemographics = demographics.ageRange && demographics.gender && demographics.education && demographics.country;
  const canProceedConsent = consentState.consentResearch && consentState.consentProcessing && consentState.acknowledgedArt13;

  /** From demographics: consent step auto-skips forward when consentTimestamp exists — do not setStep('consent') or we bounce in a loop. */
  const handleDemographicsBack = () => {
    stopAllDialogueAudio();
    const hasConsent = !!getSessionStoreSnapshot().consentTimestamp;
    if (hasConsent) {
      router.push('/flow/path-selection');
    } else {
      setStep('consent');
    }
  };

  const handleConsentSubmit = async () => {
    if (!canProceedConsent) return;
    
    console.log('[Onboarding] Consent submit clicked');
    const timestamp = new Date().toISOString();
    
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
    
    // Zapisz consentTimestamp od razu po wyrażeniu zgody
    await updateSessionData({ consentTimestamp: timestamp });
    void initAnonSessionAfterConsent();
    
    console.log('[Onboarding] ✅ Moving to demographics step');
    setStep('demographics');
  };

  const handleDemographicsSubmit = async () => {
    if (!canProceedDemographics) return;

    stopAllDialogueAudio();
    await updateSessionData({
      demographics: demographics,
    });

    // Use store snapshot — `sessionData` from render can be stale right after `updateSessionData`.
    const latest = getSessionStoreSnapshot() as { pathType?: 'fast' | 'full' };
    const pathType = (latest.pathType ?? 'fast') as 'fast' | 'full';

    console.log('[Onboarding] Demographics complete, pathType:', pathType);

    if (pathType === 'fast') {
      console.log('[Onboarding] FAST TRACK → photo upload');
      router.push('/flow/fast-track');
    } else {
      console.log('[Onboarding] FULL EXPERIENCE → setup/profile');
      router.push('/setup/profile');
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
      sessionCookieText:
        'Techniczne: po akceptacji zgody ustawiamy HttpOnly cookie z losowym identyfikatorem sesji anonimowej oraz (serwerowo) jednokierunkowy skrót adresu IP w celu ograniczenia nadużyć limitu darmowych generacji (nie w celu identyfikacji marketingowej).',
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
      accordion3Content: 'Dane mogą być przetwarzane przez dostawców infrastruktury niezbędnych do działania usługi: Vercel (hosting/analityka), Google Cloud (baza, magazyn, generacja obrazów, backend API), Stripe (płatności jeśli dotyczy).',
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
      sessionCookieText:
        'Technical: after you accept, we set an HttpOnly cookie with a random anonymous session id and a one-way server-side hash of the IP address to limit abuse of free generation quotas (not for marketing identification).',
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
      accordion3Content: 'Data may be processed by infrastructure providers necessary for service operation: Vercel (hosting/analytics), Google Cloud (database, storage, image generation, backend API), Stripe (payments if applicable).',
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
    <div className={FLOW_WIZARD_PAGE_SHELL}>
      {/* Formularz zgody/demographics — page scrolls (no inner card scrollbar on mobile). */}
      <div className="w-full max-w-4xl mx-auto pb-28 sm:pb-32">
          {step === 'consent' && (
            <motion.div initial={false} animate={{ opacity: 1, y: 0 }}>
              <GlassCard
                variant="flatOnMobile"
                className={`w-full p-4 sm:p-6 md:p-8 flex flex-col ${GLASS_CARD_DESKTOP_GROW_STEP} !shadow-none`}
              >
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
                    <p className="leading-snug text-xs text-silver-dark mt-2">{texts.sessionCookieText}</p>
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
                  <OnboardingConsentLearnMore
                    texts={{
                      accordion1Title: texts.accordion1Title,
                      accordion1Content: texts.accordion1Content,
                      accordion2Title: texts.accordion2Title,
                      accordion2Content: texts.accordion2Content,
                      accordion3Title: texts.accordion3Title,
                      accordion3Content: texts.accordion3Content,
                      accordion4Title: texts.accordion4Title,
                      accordion4Content: texts.accordion4Content,
                      accordion5Title: texts.accordion5Title,
                      accordion5Content: texts.accordion5Content,
                    }}
                  />
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
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      stopAllDialogueAudio();
                      router.push('/');
                    }}
                  >
                    ← {texts.back}
                  </GlassButton>

                  <GlassButton
                    type="button"
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
            <OnboardingDemographicsStep
              data={demographics}
              onUpdate={setDemographics}
              onBack={handleDemographicsBack}
              onSubmit={handleDemographicsSubmit}
              canProceed={Boolean(canProceedDemographics)}
            />
          )}
      </div>

      {/* Dialog IDA na dole - cała szerokość */}
      <div className="w-full pointer-events-none">
        <AwaDialogue
          currentStep={step === 'demographics' ? 'wizard_demographics' : 'onboarding'}
          fullWidth={true}
          autoHide={true}
        />
      </div>
    </div>
  );
};

export default OnboardingScreen;