"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { AwaDialogue } from "@/components/awa/AwaDialogue";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSessionData } from "@/hooks/useSessionData";
import { IPIP_120_ITEMS, calculateIPIPNEO120Scores, IPIP_DOMAIN_LABELS, type IPIPNEOScores } from "@/lib/questions/ipip-neo-120";
import { saveUserProfile } from "@/lib/supabase-deep-personalization";
import { mapSessionToUserProfile } from "@/lib/profile-mapper";
import { 
  Brain, 
  ArrowRight, 
  ArrowLeft
} from "lucide-react";

export default function BigFivePage() {
  const { language } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { sessionData, updateSessionData } = useSessionData();
  const fromDashboard = searchParams?.get('from') === 'dashboard';
  const retake = searchParams?.get('retake') === 'true';
  const shouldGoDashboard = fromDashboard || retake;
  
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [scores, setScores] = useState<IPIPNEOScores | null>(null);
  const [isLegacyResult, setIsLegacyResult] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [answeredCount, setAnsweredCount] = useState(0);
  const autoSavedRef = React.useRef(false);
  const resultsShownRef = React.useRef(false);
  const retakeInitializedRef = React.useRef(false);
  const prevRetakeRef = React.useRef(retake);

  const STEP_CARD_HEIGHT = "min-h-[700px] max-h-[85vh]";

  // Reset retake initialization when retake parameter changes from false to true
  useEffect(() => {
    if (retake && !prevRetakeRef.current) {
      // retake changed from false to true - reset initialization flag
      retakeInitializedRef.current = false;
    }
    prevRetakeRef.current = retake;
  }, [retake]);

  const t = (pl: string, en: string) => (language === "pl" ? pl : en);

  // Load existing responses from session
  useEffect(() => {
    // CRITICAL: Never reset if results are already showing - completely block useEffect
    if (resultsShownRef.current) {
      return;
    }
    
    // If retake is requested, reset everything and start fresh (only on initial retake)
    if (retake && !retakeInitializedRef.current) {
      setResponses({});
      setCurrentQuestion(0);
      setShowResults(false);
      setScores(null);
      setIsLegacyResult(false);
      autoSavedRef.current = false;
      resultsShownRef.current = false;
      retakeInitializedRef.current = true;
      return;
    }
    
    // If retake is true but we've already initialized, don't interfere with the test
    if (retake && retakeInitializedRef.current) {
      return;
    }

    if (!sessionData?.bigFive) {
      return;
    }

    const savedScores = normalizeScoresStructure(sessionData.bigFive.scores);
    const hasIPIP120Shape =
      sessionData.bigFive.instrument === 'IPIP-NEO-120' ||
      Boolean((sessionData.bigFive.scores as IPIPNEOScores | undefined)?.domains);

    if (!hasIPIP120Shape) {
      setIsLegacyResult(Boolean(savedScores));
      if (savedScores) {
        setScores(savedScores);
        setShowResults(true);
        resultsShownRef.current = true;
      } else {
        setShowResults(false);
      }
      setResponses({});
      setCurrentQuestion(0);
      return;
    }

    setIsLegacyResult(false);

    const storedResponses = sessionData.bigFive.responses || {};
    const responseCount = Object.keys(storedResponses).length;
    
    // Completed test – prefer stored scores if present
    if (sessionData.bigFive.completedAt && savedScores && !retake) {
      // If fewer than 120 responses, treat as incomplete and continue the test
      if (responseCount < IPIP_120_ITEMS.length) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'big-five/page.tsx:80',message:'Loaded saved scores but responses incomplete, continuing test',data:{responseCount,totalItems:IPIP_120_ITEMS.length,hasSavedScores:Boolean(savedScores)},timestamp:Date.now(),sessionId:'debug-session',runId:'personality-check',hypothesisId:'H2'})}).catch(()=>{});
        // #endregion
        setResponses(storedResponses);
        setShowResults(false);
        setScores(null);
        const nextQuestion = Math.min(responseCount, IPIP_120_ITEMS.length - 1);
        setCurrentQuestion(nextQuestion);
      } else {
        // Test is complete - show results and BLOCK any further resets
        setResponses(storedResponses);
        setScores(savedScores);
        setShowResults(true);
        resultsShownRef.current = true; // CRITICAL: Block all future resets
      }
      return;
    }

    // Not completed yet - load responses and continue
    setResponses(storedResponses);
    
    if (responseCount >= IPIP_120_ITEMS.length) {
      // All responses present - show results
      setShowResults(true);
      resultsShownRef.current = true; // CRITICAL: Block all future resets
      if (savedScores) {
        setScores(savedScores);
      } else {
        const finalScores = calculateIPIPNEO120Scores(storedResponses);
        setScores(finalScores);
      }
    } else {
      // Continue test from where we left off
      const nextQuestion = Math.min(responseCount, IPIP_120_ITEMS.length - 1);
      setCurrentQuestion(nextQuestion);
    }
  }, [sessionData, retake]);

  const handleResponse = (value: number) => {
    const item = IPIP_120_ITEMS[currentQuestion];
    if (!item) return; // Safety check
    
    const isLastQuestion = currentQuestion >= IPIP_120_ITEMS.length - 1;
    
    setResponses(prev => {
      const already = prev[item.id] !== undefined;
      const next = { ...prev, [item.id]: value };
      const prevCount = Object.keys(prev).length;
      const nextCount = already ? prevCount : prevCount + 1;
      setAnsweredCount(nextCount);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'big-five/page.tsx:106',message:'handleResponse setResponses',data:{questionIndex:currentQuestion,itemId:item.id,value,prevCount,nextCount,already,isLastQuestion,nextCountTotal:Object.keys(next).length},timestamp:Date.now(),sessionId:'debug-session',runId:'personality-check',hypothesisId:'H4'})}).catch(()=>{});
      // #endregion
      
      // If this is the last question, calculate scores and show results using the updated state
      if (isLastQuestion) {
        // Verify all 120 responses are present
        const allResponsesCount = Object.keys(next).length;
        if (allResponsesCount === IPIP_120_ITEMS.length) {
          const finalScores = calculateIPIPNEO120Scores(next);
          setScores(finalScores);
          setShowResults(true);
          resultsShownRef.current = true; // Mark that results are shown
        } else {
          // Not all responses yet - this shouldn't happen but handle gracefully
          console.warn(`Expected ${IPIP_120_ITEMS.length} responses but got ${allResponsesCount}`);
        }
      }
      
      return next;
    });
    
    // Auto-advance immediately after selection (only if not last question)
    if (!isLastQuestion) {
      setCurrentQuestion(prev => Math.min(prev + 1, IPIP_120_ITEMS.length - 1));
    }
  };

  const handleNext = () => {
    const item = IPIP_120_ITEMS[currentQuestion];
    const answered = item && responses[item.id] !== undefined;
    if (!answered) {
      setValidationError(t("Zaznacz odpowiedź, zanim przejdziesz dalej.", "Select an answer before moving on."));
      goToFirstMissing();
      return;
    }
    if (currentQuestion < IPIP_120_ITEMS.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const goToFirstMissing = () => {
    const missing = IPIP_120_ITEMS.findIndex(item => responses[item.id] === undefined);
    if (missing >= 0) {
      setCurrentQuestion(missing);
    }
  };

  const handleSave = async () => {
    if (isLegacyResult) {
      router.push("/dashboard");
      return;
    }

    // Validation: ensure all 120 responses are present before saving
    const responseCount = Object.keys(responses).length;
    const hasAllResponses = responseCount === IPIP_120_ITEMS.length;
    const missingItems = IPIP_120_ITEMS.filter(i => responses[i.id] === undefined);
    const missingIndices = missingItems.map(item => IPIP_120_ITEMS.findIndex(i => i.id === item.id) + 1);

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'big-five/page.tsx:145',message:'handleSave validation',data:{responseCount,totalItems:IPIP_120_ITEMS.length,hasAllResponses,missingCount:missingItems.length,missingIndices:missingIndices.slice(0,10)},timestamp:Date.now(),sessionId:'debug-session',runId:'personality-check',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion

    if (!hasAllResponses) {
      const missingText = missingIndices.length <= 5 
        ? missingIndices.join(', ')
        : `${missingIndices.slice(0, 5).join(', ')} i ${missingIndices.length - 5} więcej`;
      setValidationError(
        t(
          `Brakuje odpowiedzi na pytania: ${missingText}. Przejdź do nich i uzupełnij.`,
          `Missing answers for questions: ${missingText}. Please go back and complete them.`
        )
      );
      goToFirstMissing();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'big-five/page.tsx:155',message:'handleSave missing items',data:{missingCount:IPIP_120_ITEMS.length-responseCount,missingIndices:missingIndices.slice(0,20)},timestamp:Date.now(),sessionId:'debug-session',runId:'personality-check',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
      return;
    }

    setValidationError(null);
    setIsSubmitting(true);
    try {
      const finalScores = calculateIPIPNEO120Scores(responses);
      const updatedSessionData = {
        ...sessionData,
        bigFive: {
          instrument: 'IPIP-NEO-120',
          responses,
          scores: finalScores,
          completedAt: new Date().toISOString()
        }
      };
      
      // Update session data first
      await updateSessionData({
        bigFive: {
          instrument: 'IPIP-NEO-120',
          responses,
          scores: finalScores,
          completedAt: new Date().toISOString()
        }
      } as any);
      
      // CRITICAL: Immediately save to Supabase user_profiles to ensure data is persisted
      // This ensures that retake updates are saved even if useProfileSync hasn't run yet
      try {
        const profileData = mapSessionToUserProfile(updatedSessionData as any);
        if (profileData.personality && sessionData?.userHash) {
          await saveUserProfile({
            userHash: sessionData.userHash,
            personality: profileData.personality
          });
          console.log('[BigFive] Saved personality to Supabase user_profiles');
        }
      } catch (supabaseError) {
        console.warn('[BigFive] Failed to save to Supabase directly (useProfileSync will handle it):', supabaseError);
        // Don't fail the whole operation if Supabase save fails - useProfileSync will retry
      }
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'big-five/page.tsx:209',message:'handleSave redirect',data:{fromDashboard,retake,shouldGoDashboard,redirectingTo:'/dashboard'},timestamp:Date.now(),sessionId:'debug-session',runId:'personality-check',hypothesisId:'H5'})}).catch(()=>{});
      // #endregion

      // Always redirect to dashboard after completing Big Five test
      router.push("/dashboard");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-save when all questions are answered and results are visible
  useEffect(() => {
    const hasAllResponses = Object.keys(responses).length === IPIP_120_ITEMS.length;
    if (!showResults || !scores || !hasAllResponses) return;
    if (autoSavedRef.current) return;
    if (!resultsShownRef.current) return; // Don't auto-save if results aren't shown yet

    autoSavedRef.current = true;

    const runAutoSave = async () => {
      try {
        const finalScores = scores || calculateIPIPNEO120Scores(responses);
        const updatedSessionData = {
          ...sessionData,
          bigFive: {
            instrument: 'IPIP-NEO-120',
            responses,
            scores: finalScores,
            completedAt: new Date().toISOString()
          }
        };
        
        await updateSessionData({
          bigFive: {
            instrument: 'IPIP-NEO-120',
            responses,
            scores: finalScores,
            completedAt: new Date().toISOString()
          }
        } as any);

        // CRITICAL: Immediately save to Supabase user_profiles to ensure data is persisted
        // This ensures that retake updates are saved even if useProfileSync hasn't run yet
        try {
          const profileData = mapSessionToUserProfile(updatedSessionData as any);
          if (profileData.personality && sessionData?.userHash) {
            await saveUserProfile({
              userHash: sessionData.userHash,
              personality: profileData.personality
            });
            console.log('[BigFive] Auto-saved personality to Supabase user_profiles');
          }
        } catch (supabaseError) {
          console.warn('[BigFive] Failed to auto-save to Supabase (useProfileSync will handle it):', supabaseError);
          // Don't fail the whole operation if Supabase save fails - useProfileSync will retry
        }

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'big-five/page.tsx:auto-save',message:'Auto-saved Big Five after 120/120 responses',data:{responseCount:Object.keys(responses).length,hasScores:!!scores},timestamp:Date.now(),sessionId:'debug-session',runId:'personality-check',hypothesisId:'H10'})}).catch(()=>{});
        // #endregion
      } catch (error) {
        autoSavedRef.current = false; // allow retry
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'big-five/page.tsx:auto-save-error',message:'Auto-save failed',data:{errorMessage:(error as Error)?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'personality-check',hypothesisId:'H10e'})}).catch(()=>{});
        // #endregion
      }
    };

    void runAutoSave();
  }, [showResults, scores, responses, updateSessionData, sessionData]);

  const handleSkip = () => {
    router.push("/dashboard");
  };

  const handleLegacyRetake = () => {
    updateSessionData({ bigFive: undefined } as any);
    setResponses({});
    setScores(null);
    setShowResults(false);
    setCurrentQuestion(0);
    setIsLegacyResult(false);
  };

  const progress = (answeredCount / IPIP_120_ITEMS.length) * 100;
  const currentItem = IPIP_120_ITEMS[currentQuestion];
  const isAnswered = currentItem ? responses[currentItem.id] !== undefined : false;
  
  // Safety check - if no current item, show loading or redirect
  if (!currentItem && !showResults) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto mb-4"></div>
          <p className="text-graphite">Loading...</p>
        </div>
      </div>
    );
  }

  if (showResults && scores) {
    // Verify all responses are present before showing results
    const responseCount = Object.keys(responses).length;
    const hasAllResponses = responseCount === IPIP_120_ITEMS.length;
    const missingCount = IPIP_120_ITEMS.length - responseCount;
    
    // If not all responses, don't show results yet - continue the test
    if (!hasAllResponses) {
      setShowResults(false);
      setScores(null);
      goToFirstMissing();
      return (
        <div className="flex flex-col w-full">
          <div className="flex-1 flex justify-center items-start">
            <div className="w-full max-w-3xl lg:max-w-none mx-auto space-y-6">
              <GlassCard className={`p-6 md:p-8 ${STEP_CARD_HEIGHT} overflow-auto scrollbar-hide`}>
                <div className="text-center">
                  <p className="text-lg text-graphite font-modern mb-4">
                    {t(
                      `Brakuje odpowiedzi na ${missingCount} ${missingCount === 1 ? 'pytanie' : 'pytań'}. Przejdź do brakujących pytań i uzupełnij je.`,
                      `Missing answers for ${missingCount} ${missingCount === 1 ? 'question' : 'questions'}. Please go back and complete them.`
                    )}
                  </p>
                  <GlassButton
                    onClick={() => {
                      setShowResults(false);
                      goToFirstMissing();
                    }}
                    className="px-8 py-3"
                  >
                    {t("Przejdź do brakujących pytań", "Go to missing questions")}
                  </GlassButton>
                </div>
              </GlassCard>
            </div>
          </div>
        </div>
      );
    }
    
    const domainEntries = getDomainEntries(scores);

    return (
      <div className="flex flex-col w-full">
        <div className="flex-1 flex justify-center items-start">
          <div className="w-full max-w-3xl lg:max-w-none mx-auto space-y-6">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <GlassCard className={`p-6 md:p-8 ${STEP_CARD_HEIGHT} overflow-auto scrollbar-hide`}>
                {/* Header */}
                <div className="text-center mb-8">
                  <motion.div
                    animate={{ 
                      scale: [1, 1.05, 1],
                      rotate: [0, 2, -2, 0]
                    }}
                    transition={{ 
                      duration: 3,
                      repeat: Infinity,
                      repeatDelay: 2
                    }}
                    className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-gold via-champagne to-platinum flex items-center justify-center"
                  >
                    <Brain size={40} className="text-white" />
                  </motion.div>
                  
                  <h1 className="text-3xl md:text-4xl font-nasalization bg-gradient-to-r from-gold via-champagne to-platinum bg-clip-text text-transparent mb-4">
                    {t("Twój Profil Osobowości", "Your Personality Profile")}
                  </h1>
                  <p className="text-lg text-graphite font-modern max-w-2xl mx-auto">
                    {t(
                      "Oto Twoje wyniki testu Big Five. IDA użyje ich do personalizacji wnętrz.",
                      "Here are your Big Five test results. IDA will use them to personalize your interiors."
                    )}
                  </p>
                </div>

                {isLegacyResult && (
                  <div className="mb-6 rounded-2xl border border-gold/30 bg-white/40 p-4 text-sm font-modern text-graphite">
                    {t(
                      "Wykonaj test Big Five (IPIP-NEO-120), aby zobaczyć szczegółową analizę.",
                      "Take the Big Five test (IPIP-NEO-120) to see detailed analysis."
                    )}
                  </div>
                )}

                {/* Results */}
                {domainEntries.length === 0 ? (
                  <div className="text-center text-silver-dark font-modern mb-8">
                    {t(
                      "Brak danych do wyświetlenia. Spróbuj ponownie wykonać test.",
                      "No data available to display. Please retake the test."
                    )}
                  </div>
                ) : (
                  <div className="space-y-6 mb-8">
                    {domainEntries.map(([domain, score], index) => (
                      <motion.div
                        key={domain}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        className="glass-panel rounded-xl p-6"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-xl font-nasalization text-graphite">
                            {IPIP_DOMAIN_LABELS[domain][language]}
                          </h3>
                          <span className="text-2xl font-bold text-gold">{score}%</span>
                        </div>
                        
                        <div className="w-full bg-white/20 rounded-full h-3 mb-2">
                          <div 
                            className="bg-gradient-to-r from-gold to-champagne h-3 rounded-full transition-all duration-1000"
                            style={{ width: `${score}%` }}
                          />
                        </div>
                        
                        <p className="text-sm text-silver-dark font-modern">
                          {getScoreDescription(domain, score, language)}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  {isLegacyResult ? (
                    <>
                      <GlassButton
                        onClick={handleLegacyRetake}
                        className="px-8 py-3"
                      >
                        {t("Wykonaj nowy test", "Retake the new test")}
                      </GlassButton>
                      <GlassButton
                        onClick={handleSkip}
                        variant="secondary"
                        className="px-8 py-3"
                      >
                        {t("Wróć do panelu", "Back to dashboard")}
                      </GlassButton>
                    </>
                  ) : (
                    <>
                      <GlassButton
                        onClick={handleSkip}
                        variant="secondary"
                        className="px-8 py-3"
                      >
                        {t("Pomiń", "Skip")}
                      </GlassButton>
                      
                      <GlassButton
                        onClick={handleSave}
                        disabled={isSubmitting}
                        className="px-8 py-3"
                      >
                        <span className="flex items-center gap-2">
                          {isSubmitting ? t("Zapisywanie…", "Saving…") : t("Kontynuuj", "Continue")}
                          <ArrowRight size={18} />
                        </span>
                      </GlassButton>
                      {validationError && (
                        <p className="text-sm text-amber-500 text-center sm:text-left">
                          {validationError}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </GlassCard>
            </motion.div>
          </div>
        </div>

        {/* Dialog IDA na dole */}
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

  return (
    <div className="flex flex-col w-full">
      <div className="flex-1 flex justify-center items-start">
        <div className="w-full max-w-3xl lg:max-w-none mx-auto space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <GlassCard className={`p-6 md:p-8 ${STEP_CARD_HEIGHT} overflow-auto scrollbar-hide`}>
              {/* Header */}
              <div className="text-center mb-8">
                <motion.div
                  animate={{ 
                    scale: [1, 1.05, 1],
                    rotate: [0, 2, -2, 0]
                  }}
                  transition={{ 
                    duration: 3,
                    repeat: Infinity,
                    repeatDelay: 2
                  }}
                  className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-gold via-champagne to-platinum flex items-center justify-center"
                >
                  <Brain size={40} className="text-white" />
                </motion.div>
                
                <h1 className="text-3xl md:text-4xl font-nasalization bg-gradient-to-r from-gold via-champagne to-platinum bg-clip-text text-transparent mb-4">
                  {t("Test Osobowości Big Five", "Big Five Personality Test")}
                </h1>
                <p className="text-lg text-graphite font-modern max-w-2xl mx-auto">
                  {t(
                    "Odpowiedz na 120 pytań aby IDA mogła lepiej Cię poznać i spersonalizować wnętrza.",
                    "Answer 120 questions so IDA can get to know you better and personalize your interiors."
                  )}
                </p>
              </div>

              {/* Progress */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-modern text-graphite">
                    {t("Pytanie", "Question")} {currentQuestion + 1} / {IPIP_120_ITEMS.length}
                  </span>
                  <span className="text-sm font-modern text-silver-dark">
                    {Math.round(progress)}%
                  </span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-gold to-champagne h-2 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Question */}
              <div className="mb-8">
                <div className="text-center mb-6">
                  <h2 className="text-xl lg:text-2xl font-nasalization text-graphite mb-4">
                    {currentItem?.text[language] || 'Loading...'}
                  </h2>
                  <p className="text-sm text-silver-dark font-modern">
                    {t("Jak bardzo się z tym zgadzasz?", "How much do you agree with this?")}
                  </p>
                </div>

                {/* Response Options */}
                <div className="grid grid-cols-5 gap-4 max-w-2xl mx-auto">
                  {[1, 2, 3, 4, 5].map((value) => {
                    const isSelected = currentItem && responses[currentItem.id] === value;
                    return (
                    <motion.button
                      key={value}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleResponse(value)}
                      className={`p-4 rounded-xl font-modern transition-all duration-300 ${
                        isSelected
                          ? 'bg-gradient-to-br from-gold to-champagne text-white shadow-lg'
                          : 'bg-white/50 backdrop-blur-sm border border-white/60 hover:bg-white/60 text-graphite'
                      }`}
                    >
                      <div className="text-2xl font-bold mb-1">{value}</div>
                      <div className="text-xs">
                        {value === 1 ? t("Zdecydowanie nie", "Strongly disagree") :
                         value === 2 ? t("Nie", "Disagree") :
                         value === 3 ? t("Neutralnie", "Neutral") :
                         value === 4 ? t("Zgadzam się", "Agree") :
                         t("Zdecydowanie tak", "Strongly agree")}
                      </div>
                    </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-between mt-auto pt-6">
                <div className="flex gap-4">
                  <GlassButton
                    onClick={handlePrevious}
                    disabled={currentQuestion === 0}
                    variant="secondary"
                    className="px-6 py-3"
                  >
                    <ArrowLeft size={18} className="mr-2" />
                    {t("Wstecz", "Back")}
                  </GlassButton>

                  <GlassButton
                    onClick={handleSkip}
                    variant="secondary"
                    className="px-6 py-3"
                  >
                    {t("Pomiń test", "Skip test")}
                  </GlassButton>
                </div>
                
                {isAnswered && currentQuestion < IPIP_120_ITEMS.length - 1 && (
                  <GlassButton
                    onClick={handleNext}
                    className="px-6 py-3"
                  >
                    {t("Dalej", "Next")}
                    <ArrowRight size={18} className="ml-2" />
                  </GlassButton>
                )}
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </div>

      {/* Dialog IDA na dole */}
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

function getScoreDescription(domain: 'O' | 'C' | 'E' | 'A' | 'N', score: number, language: 'pl' | 'en'): string {
  const descriptions = {
    O: {
      pl: score > 70 ? "Bardzo otwarty na nowe doświadczenia" : 
          score > 40 ? "Umiarkowanie otwarty na doświadczenia" : 
          "Preferuje znane i tradycyjne rozwiązania",
      en: score > 70 ? "Very open to new experiences" : 
          score > 40 ? "Moderately open to experiences" : 
          "Prefers familiar and traditional solutions"
    },
    C: {
      pl: score > 70 ? "Bardzo zorganizowany i sumienny" : 
          score > 40 ? "Umiarkowanie zorganizowany" : 
          "Elastyczny i spontaniczny",
      en: score > 70 ? "Very organized and conscientious" : 
          score > 40 ? "Moderately organized" : 
          "Flexible and spontaneous"
    },
    E: {
      pl: score > 70 ? "Bardzo towarzyski i energiczny" : 
          score > 40 ? "Umiarkowanie towarzyski" : 
          "Cichy i zarezerwowany",
      en: score > 70 ? "Very sociable and energetic" : 
          score > 40 ? "Moderately sociable" : 
          "Quiet and reserved"
    },
    A: {
      pl: score > 70 ? "Bardzo ugodowy i współczujący" : 
          score > 40 ? "Umiarkowanie ugodowy" : 
          "Asertywny i bezpośredni",
      en: score > 70 ? "Very agreeable and compassionate" : 
          score > 40 ? "Moderately agreeable" : 
          "Assertive and direct"
    },
    N: {
      pl: score > 70 ? "Często odczuwa stres i niepokój" : 
          score > 40 ? "Umiarkowanie wrażliwy" : 
          "Spokojny i opanowany",
      en: score > 70 ? "Often feels stress and anxiety" : 
          score > 40 ? "Moderately sensitive" : 
          "Calm and composed"
    }
  };

  return descriptions[domain][language];
}

const DOMAIN_KEYS: Array<keyof IPIPNEOScores['domains']> = ['O', 'C', 'E', 'A', 'N'];

function createEmptyFacets(): IPIPNEOScores['facets'] {
  return {
    O: {},
    C: {},
    E: {},
    A: {},
    N: {},
  };
}

function clampScoreValue(value: unknown): number | null {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }
  const rounded = Math.round(value);
  return Math.max(0, Math.min(100, rounded));
}

function normalizeScoresStructure(rawScores: unknown): IPIPNEOScores | null {
  if (!rawScores || typeof rawScores !== 'object') {
    return null;
  }

  const maybeScores = rawScores as Partial<IPIPNEOScores> & Record<string, unknown>;

  if (maybeScores.domains && typeof maybeScores.domains === 'object') {
    const domainValues = DOMAIN_KEYS.map((key) => [key, clampScoreValue((maybeScores.domains as any)[key])] as const);
    if (domainValues.some(([, value]) => value === null)) {
      return null;
    }

    return {
      domains: domainValues.reduce((acc, [key, value]) => {
        acc[key] = value as number;
        return acc;
      }, {} as IPIPNEOScores['domains']),
      facets: {
        O: maybeScores.facets?.O || {},
        C: maybeScores.facets?.C || {},
        E: maybeScores.facets?.E || {},
        A: maybeScores.facets?.A || {},
        N: maybeScores.facets?.N || {},
      },
    };
  }

  const fallbackDomains = DOMAIN_KEYS.reduce((acc, key) => {
    const legacyKey =
      key === 'O' ? 'openness' :
      key === 'C' ? 'conscientiousness' :
      key === 'E' ? 'extraversion' :
      key === 'A' ? 'agreeableness' :
      'neuroticism';
    const value =
      clampScoreValue((maybeScores as Record<string, unknown>)[legacyKey]) ??
      clampScoreValue((maybeScores as Record<string, unknown>)[key]);

    acc[key] = value ?? undefined;
    return acc;
  }, {} as Partial<IPIPNEOScores['domains']>);

  if (DOMAIN_KEYS.some((key) => typeof fallbackDomains[key] !== 'number')) {
    return null;
  }

  return {
    domains: fallbackDomains as IPIPNEOScores['domains'],
    facets: createEmptyFacets(),
  };
}

function getDomainEntries(scoreData: IPIPNEOScores | null): Array<[keyof IPIPNEOScores['domains'], number]> {
  if (!scoreData?.domains) {
    return [];
  }

  return DOMAIN_KEYS
    .map((key) => {
      const value = scoreData.domains[key];
      return typeof value === 'number' ? ([key, value] as [keyof IPIPNEOScores['domains'], number]) : null;
    })
    .filter((entry): entry is [keyof IPIPNEOScores['domains'], number] => Boolean(entry));
}
