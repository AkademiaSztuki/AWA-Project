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
import { RadarChart, DomainDescription } from '@/components/dashboard/BigFiveDetailed';
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
  const initializedRef = React.useRef(false);

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

  // Load existing responses from session - only on mount or when retake changes
  useEffect(() => {
    // CRITICAL: Never reset if results are already showing - completely block useEffect
    if (resultsShownRef.current && !retake) {
      return;
    }
    
    // If retake is requested, reset everything and start fresh (only on initial retake)
    if (retake && !retakeInitializedRef.current) {
      setResponses({});
      setCurrentQuestion(0);
      setShowResults(false);
      setScores(null);
      setIsLegacyResult(false);
      setAnsweredCount(0);
      autoSavedRef.current = false;
      resultsShownRef.current = false;
      retakeInitializedRef.current = true;
      initializedRef.current = false;
      return;
    }
    
    // If retake is true but we've already initialized, don't interfere with the test
    if (retake && retakeInitializedRef.current) {
      return;
    }
    
    // If we've already initialized and user is actively taking the test, don't reset
    if (initializedRef.current && Object.keys(responses).length > 0 && !retake) {
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
      setAnsweredCount(0);
      return;
    }

    setIsLegacyResult(false);

    const storedResponses = sessionData.bigFive.responses || {};
    const responseCount = Object.keys(storedResponses).length;
    
    // Only load if we don't have responses yet, or if stored responses are more complete
    // OR if the test is completed in sessionData but not in our state
    const currentResponseCount = Object.keys(responses).length;
    const isCompletedInSession = Boolean(sessionData.bigFive.completedAt);
    const isCompletedInState = resultsShownRef.current && showResults;
    
    // Don't overwrite if we have same or more responses AND test is not completed in session
    if (currentResponseCount > 0 && responseCount <= currentResponseCount && !isCompletedInSession && !retake) {
      // We already have responses and they're not less complete than stored - don't overwrite
      return;
    }
    
    // If test is completed in session but not in state, we should load it
    if (isCompletedInSession && !isCompletedInState) {
      // Force load completed test
    } else if (currentResponseCount >= IPIP_120_ITEMS.length && !retake) {
      // We already have all responses - don't overwrite unless retaking
      return;
    }
    
    // Initialize answeredCount from loaded responses
    setAnsweredCount(responseCount);
    
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
    
    // Mark as initialized after loading
    initializedRef.current = true;
  }, [sessionData?.bigFive?.completedAt, sessionData?.bigFive?.responses, retake]); // Only depend on specific fields

  const handleResponse = (value: number) => {
    const item = IPIP_120_ITEMS[currentQuestion];
    if (!item) return; // Safety check
    
    // Prevent double-clicking or rapid responses
    if (responses[item.id] === value) {
      return; // Already answered with this value
    }
    
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
      
      // If this is the last question, calculate scores and show results
      if (isLastQuestion) {
        // Verify all 120 responses are present
        const allResponsesCount = Object.keys(next).length;
        if (allResponsesCount === IPIP_120_ITEMS.length) {
          // Calculate and show results immediately
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

    // Prevent double submission
    if (isSubmitting) {
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
    
    // Mark as saved to prevent auto-save from running again
    autoSavedRef.current = true;
    
    try {
      const finalScores = scores || calculateIPIPNEO120Scores(responses);
      
      // Update session data first
      await updateSessionData({
        bigFive: {
          instrument: 'IPIP-NEO-120',
          responses,
          scores: finalScores,
          completedAt: new Date().toISOString()
        }
      } as any);
      
      // NOTE: After radical refactor, data is saved via updateSessionData -> saveFullSessionToSupabase
      // which writes to participants table. No need for direct saveUserProfile call.
      
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

    // CRITICAL: Mark as auto-saving to prevent main useEffect from resetting
    autoSavedRef.current = true;

    const runAutoSave = async () => {
      try {
        const finalScores = scores || calculateIPIPNEO120Scores(responses);
        
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
          const updatedSessionData = {
            ...sessionData,
            bigFive: {
              instrument: 'IPIP-NEO-120',
              responses,
              scores: finalScores,
              completedAt: new Date().toISOString()
            }
          };
          // NOTE: After radical refactor, data is saved via updateSessionData -> saveFullSessionToSupabase
          // which writes to participants table. No need for direct saveUserProfile call.
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
  }, [showResults, scores, responses, updateSessionData, sessionData?.userHash]); // Only depend on userHash, not entire sessionData

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

  // Calculate progress from actual responses (more reliable than answeredCount state)
  const actualResponseCount = Object.keys(responses).length;
  const progress = (actualResponseCount / IPIP_120_ITEMS.length) * 100;
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

    // Prepare domain data for DomainDescription components
    const domainMap: Record<string, number> = {};
    if (scores.domains) {
      Object.entries(scores.domains).forEach(([key, value]) => {
        if (typeof value === 'number' && ['O', 'C', 'E', 'A', 'N'].includes(key)) {
          domainMap[key] = value;
        }
      });
    }
    const orderedDomains = ['O', 'C', 'E', 'A', 'N'].map(key => ({
      key: key as 'O' | 'C' | 'E' | 'A' | 'N',
      score: domainMap[key] || 50
    }));

    return (
      <div className="min-h-screen flex flex-col w-full">
        <div className="flex-1 flex justify-center items-start">
          <div className="w-full max-w-6xl mx-auto space-y-6">
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
                  
                  <h1 className="text-3xl md:text-4xl font-nasalization text-graphite mb-4">
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
                  <>
                    {/* Radar Chart Section */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                      className="mb-8"
                    >
                      <GlassCard className="p-8 bg-white/10 backdrop-blur-xl border border-white/20">
                        <h2 className="text-2xl font-nasalization text-graphite mb-6 text-center">
                          {t('Profil Osobowości', 'Personality Profile')}
                        </h2>
                        <RadarChart scores={scores} />
                        <div className="mt-6 text-center text-sm text-silver-dark font-modern">
                          {t(
                            'Wykres pokazuje Twoje wyniki w pięciu głównych wymiarach osobowości',
                            'Chart shows your scores in the five main personality dimensions'
                          )}
                        </div>
                      </GlassCard>
                    </motion.div>

                    {/* Detailed Descriptions */}
                    <div className="space-y-6 mb-8">
                      <h2 className="text-2xl font-nasalization text-graphite mb-4">
                        {t('Szczegółowe Opisy Wymiarów', 'Detailed Dimension Descriptions')}
                      </h2>

                      {orderedDomains.map(({ key, score }, index) => {
                        const facetScores = scores.facets?.[key];
                        return (
                          <motion.div
                            key={key}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                          >
                            <DomainDescription
                              domain={key}
                              score={score}
                              facets={facetScores}
                            />
                          </motion.div>
                        );
                      })}
                    </div>
                  </>
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
            currentStep="big_five" 
            fullWidth={true}
            autoHide={true}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col w-full">
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
                <div className="grid grid-cols-5 gap-2 sm:gap-3 md:gap-4 max-w-2xl mx-auto">
                  {[1, 2, 3, 4, 5].map((value) => {
                    const isSelected = currentItem && responses[currentItem.id] === value;
                    return (
                    <motion.button
                      key={value}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleResponse(value)}
                      className={`p-2 sm:p-3 md:p-4 rounded-xl font-modern transition-all duration-300 ${
                        isSelected
                          ? 'bg-gradient-to-br from-gold to-champagne text-white shadow-lg'
                          : 'bg-white/50 backdrop-blur-sm border border-white/60 hover:bg-white/60 text-graphite'
                      }`}
                    >
                      <div className="text-lg sm:text-xl md:text-2xl font-bold mb-0.5 sm:mb-1">{value}</div>
                      <div className="text-[10px] sm:text-xs leading-tight break-words">
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
              <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-4 mt-auto pt-6">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 flex-1">
                  <GlassButton
                    onClick={handlePrevious}
                    disabled={currentQuestion === 0}
                    variant="secondary"
                    className="px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base"
                  >
                    <ArrowLeft size={16} className="sm:w-[18px] sm:h-[18px] mr-1.5 sm:mr-2" />
                    {t("Wstecz", "Back")}
                  </GlassButton>

                  <GlassButton
                    onClick={handleSkip}
                    variant="secondary"
                    className="px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base"
                  >
                    {t("Pomiń test", "Skip test")}
                  </GlassButton>
                </div>
                
                {isAnswered && currentQuestion < IPIP_120_ITEMS.length - 1 && (
                  <GlassButton
                    onClick={handleNext}
                    className="px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base"
                  >
                    {t("Dalej", "Next")}
                    <ArrowRight size={16} className="sm:w-[18px] sm:h-[18px] ml-1.5 sm:ml-2" />
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
          currentStep="big_five" 
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
