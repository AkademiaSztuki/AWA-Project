"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { useLanguage } from "@/contexts/LanguageContext";
import { useProfileWizard } from "@/components/setup/profile/ProfileWizardContext";
import { IPIP_120_ITEMS, calculateIPIPNEO120Scores, IPIP_DOMAIN_LABELS, type IPIPNEOScores } from "@/lib/questions/ipip-neo-120";
import { 
  Brain, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle,
  Clock,
  User
} from "lucide-react";

export default function BigFivePage() {
  const { language } = useLanguage();
  const router = useRouter();
  // Use ProfileWizard context instead of direct session usage for navigation consistency
  const { 
    profileData, 
    updateProfile, 
    completeStep, 
    goToPreviousStep,
    progress: wizardProgress 
  } = useProfileWizard();
  
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [scores, setScores] = useState<IPIPNEOScores | null>(null);
  const [isLegacyResult, setIsLegacyResult] = useState(false);

  const t = (pl: string, en: string) => (language === "pl" ? pl : en);

  // Load existing responses from profileData
  useEffect(() => {
    // Initialize from wizard profileData first
    if (profileData.bigFive) {
      const savedData = profileData.bigFive;
      
      // Check for legacy format
      const hasIPIP120Shape =
        savedData.instrument === 'IPIP-NEO-120' ||
        Boolean((savedData.scores as IPIPNEOScores | undefined)?.domains);

      if (!hasIPIP120Shape) {
        setIsLegacyResult(true);
        // Don't restore responses if legacy
        setResponses({});
        setCurrentQuestion(0);
        return;
      }

      setIsLegacyResult(false);

      const storedResponses = savedData.responses || {};
      setResponses(storedResponses);
      
      // If we have responses, set current question to last unanswered
      const responseCount = Object.keys(storedResponses).length;
      
      if (responseCount >= IPIP_120_ITEMS.length) {
        // All answered - show results if scores exist
        if (savedData.scores) {
           // Use explicit casting to avoid TS strict null checks issues with optional fields
           setScores(savedData.scores as unknown as IPIPNEOScores);
           setShowResults(true);
        } else {
           // Calculate scores if missing
           const finalScores = calculateIPIPNEO120Scores(storedResponses);
           setScores(finalScores);
           setShowResults(true);
        }
      } else {
        const nextQuestion = Math.min(responseCount, IPIP_120_ITEMS.length - 1);
        setCurrentQuestion(nextQuestion);
      }
    }
  }, [profileData.bigFive]);

  const handleResponse = (value: number) => {
    const item = IPIP_120_ITEMS[currentQuestion];
    if (!item) return; 
    
    const newResponses = {
      ...responses,
      [item.id]: value
    };

    setResponses(newResponses);
    
    // Update Wizard context immediately (saves progress)
    updateProfile({
        bigFive: {
            ...profileData.bigFive,
            instrument: 'IPIP-NEO-120',
            responses: newResponses,
        } as any,
    });
    
    // Auto-advance after selection
    setTimeout(() => {
      if (currentQuestion < IPIP_120_ITEMS.length - 1) {
        setCurrentQuestion(prev => Math.min(prev + 1, IPIP_120_ITEMS.length - 1));
      } else {
        // Last question - calculate scores
        const finalScores = calculateIPIPNEO120Scores({
          ...responses,
          [item.id]: value
        });
        setScores(finalScores);
        setShowResults(true);
        
        // Save scores to profile
        updateProfile({
            bigFive: {
                instrument: 'IPIP-NEO-120',
                responses: { ...responses, [item.id]: value },
                scores: finalScores,
                completedAt: new Date().toISOString()
            }
        });
      }
    }, 300);
  };

  const handleNext = () => {
    if (currentQuestion < IPIP_120_ITEMS.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    } else {
        // If first question, go back to previous wizard step
        goToPreviousStep();
    }
  };

  // This replaces "handleSave" - moves to next wizard step
  const handleContinue = async () => {
    if (isLegacyResult) {
      // If legacy, just complete step without data (or user chose to skip)
      completeStep();
      return;
    }

    setIsSubmitting(true);
    try {
      // Ensure scores are saved before moving on
      if (scores) {
          completeStep({
            bigFive: {
                instrument: 'IPIP-NEO-120',
                responses,
                scores,
                completedAt: new Date().toISOString()
            }
          });
      } else {
          completeStep();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
     completeStep();
  };

  const handleLegacyRetake = () => {
    // Clear data in wizard
    updateProfile({ bigFive: undefined });
    setResponses({});
    setScores(null);
    setShowResults(false);
    setCurrentQuestion(0);
    setIsLegacyResult(false);
  };

  const progress = ((currentQuestion + 1) / IPIP_120_ITEMS.length) * 100;
  const currentItem = IPIP_120_ITEMS[currentQuestion];
  const isAnswered = currentItem ? responses[currentItem.id] !== undefined : false;

  // Safety check
  if (!currentItem && !showResults) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto mb-4"></div>
          <p className="text-graphite">Loading...</p>
        </div>
      </div>
    );
  }

  if (showResults && scores) {
    const domainEntries = getDomainEntries(scores);

    return (
      <GlassCard className="p-8 lg:p-12">
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
          
          <h1 className="text-4xl lg:text-5xl font-nasalization bg-gradient-to-r from-gold via-champagne to-platinum bg-clip-text text-transparent mb-4">
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
              "Te wyniki pochodzą ze starszej wersji testu (IPIP-60). Aby odblokować nowy raport, wykonaj aktualny test 120 pytań.",
              "These scores come from the retired IPIP-60 test. Take the new 120-item version to unlock the refreshed insights."
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
                {t("Pomiń / Dalej", "Skip / Next")}
              </GlassButton>
            </>
          ) : (
            <>
              <GlassButton
                onClick={handleContinue}
                disabled={isSubmitting}
                className="px-8 py-3"
              >
                <span className="flex items-center gap-2">
                  {isSubmitting ? t("Zapisywanie…", "Saving…") : t("Kontynuuj", "Continue")}
                  <ArrowRight size={18} />
                </span>
              </GlassButton>
            </>
          )}
        </div>
      </GlassCard>
    );
  }

  return (
      <GlassCard className="p-8 lg:p-12">
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
          
          <h1 className="text-4xl lg:text-5xl font-nasalization bg-gradient-to-r from-gold via-champagne to-platinum bg-clip-text text-transparent mb-4">
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
                <div className="text-xs hidden sm:block">
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
        <div className="flex justify-between items-center mt-8">
          <GlassButton
            onClick={handlePrevious}
            variant="secondary"
            className="px-6 py-3"
          >
            <ArrowLeft size={18} className="mr-2" />
            {t("Wstecz", "Back")}
          </GlassButton>

          <div className="flex gap-4">
            <GlassButton
              onClick={handleSkip}
              variant="secondary"
              className="px-6 py-3"
            >
              {t("Pomiń test", "Skip test")}
            </GlassButton>
            
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
        </div>
      </GlassCard>
  );
}

// Helper functions duplicated from BigFive page for independence
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
