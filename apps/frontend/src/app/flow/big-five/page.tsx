"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { AwaContainer } from "@/components/awa/AwaContainer";
import { AwaDialogue } from "@/components/awa/AwaDialogue";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSessionData } from "@/hooks/useSessionData";
import { IPIP_60_ITEMS, calculateIPIPScores, IPIP_DOMAIN_LABELS, type IPIPScores } from "@/lib/questions/ipip-60";
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
  const { sessionData, updateSessionData } = useSessionData();
  
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [scores, setScores] = useState<IPIPScores | null>(null);

  const t = (pl: string, en: string) => (language === "pl" ? pl : en);

  // Load existing responses from session
  useEffect(() => {
    if (sessionData?.bigFive) {
      setResponses(sessionData.bigFive.responses || {});
      const responseCount = Object.keys(sessionData.bigFive.responses || {}).length;
      // If all questions answered, show results
      if (responseCount >= IPIP_60_ITEMS.length) {
        setShowResults(true);
        const finalScores = calculateIPIPScores(sessionData.bigFive.responses || {});
        setScores(finalScores);
      } else {
        // Ensure we don't exceed the array bounds
        const nextQuestion = Math.min(responseCount, IPIP_60_ITEMS.length - 1);
        setCurrentQuestion(nextQuestion);
      }
    }
  }, [sessionData]);

  const handleResponse = (value: number) => {
    const item = IPIP_60_ITEMS[currentQuestion];
    if (!item) return; // Safety check
    
    setResponses(prev => ({
      ...prev,
      [item.id]: value
    }));
    
    // Auto-advance after selection
    setTimeout(() => {
      if (currentQuestion < IPIP_60_ITEMS.length - 1) {
        setCurrentQuestion(prev => Math.min(prev + 1, IPIP_60_ITEMS.length - 1));
      } else {
        // Last question - calculate scores
        const finalScores = calculateIPIPScores({
          ...responses,
          [item.id]: value
        });
        setScores(finalScores);
        setShowResults(true);
      }
    }, 300);
  };

  const handleNext = () => {
    if (currentQuestion < IPIP_60_ITEMS.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const finalScores = calculateIPIPScores(responses);
      await updateSessionData({
        bigFive: {
          responses,
          scores: finalScores,
          completedAt: new Date().toISOString()
        }
      } as any);
      
      router.push("/flow/tinder");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    router.push("/flow/tinder");
  };

  const progress = ((currentQuestion + 1) / IPIP_60_ITEMS.length) * 100;
  const currentItem = IPIP_60_ITEMS[currentQuestion];
  const isAnswered = currentItem ? responses[currentItem.id] !== undefined : false;
  
  // Debug log
  console.log('Big Five Debug:', {
    currentQuestion,
    IPIP_60_ITEMS_length: IPIP_60_ITEMS.length,
    currentItem: currentItem?.id,
    showResults
  });
  

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
    return (
      <div className="min-h-screen flex flex-col w-full relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-radial from-pearl-50 via-platinum-50 to-silver-100 -z-10" />
        
        {/* 3D Model Background */}
        <div className="absolute inset-0 -z-5">
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-96 h-96 rounded-full bg-gradient-to-br from-gold/10 via-champagne/10 to-platinum/10 blur-3xl" />
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

        <div className="flex-1 p-4 lg:p-8 pb-32">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
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

                {/* Results */}
                <div className="space-y-6 mb-8">
                  {Object.entries(scores).map(([domain, score], index) => (
                    <motion.div
                      key={domain}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="glass-panel rounded-xl p-6"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-nasalization text-graphite">
                          {IPIP_DOMAIN_LABELS[domain as keyof typeof IPIP_DOMAIN_LABELS][language]}
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
                        {getScoreDescription(domain as keyof IPIPScores, score, language)}
                      </p>
                    </motion.div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
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
                </div>
              </GlassCard>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col w-full relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-radial from-pearl-50 via-platinum-50 to-silver-100 -z-10" />
      
      {/* 3D Model Background */}
      <div className="absolute inset-0 -z-5">
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-96 h-96 rounded-full bg-gradient-to-br from-gold/10 via-champagne/10 to-platinum/10 blur-3xl" />
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

      <div className="flex-1 p-4 lg:p-8 pb-32 flex items-center justify-center min-h-screen">
        <div className="max-w-4xl mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
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
                    "Odpowiedz na 60 pytań aby IDA mogła lepiej Cię poznać i spersonalizować wnętrza.",
                    "Answer 60 questions so IDA can get to know you better and personalize your interiors."
                  )}
                </p>
              </div>

              {/* Progress */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-modern text-graphite">
                    {t("Pytanie", "Question")} {currentQuestion + 1} / {IPIP_60_ITEMS.length}
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
              <div className="flex justify-between">
                <GlassButton
                  onClick={handlePrevious}
                  disabled={currentQuestion === 0}
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
                  
                  {isAnswered && currentQuestion < IPIP_60_ITEMS.length - 1 && (
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
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function getScoreDescription(domain: keyof IPIPScores, score: number, language: 'pl' | 'en'): string {
  const descriptions = {
    openness: {
      pl: score > 70 ? "Bardzo otwarty na nowe doświadczenia" : 
          score > 40 ? "Umiarkowanie otwarty na doświadczenia" : 
          "Preferuje znane i tradycyjne rozwiązania",
      en: score > 70 ? "Very open to new experiences" : 
          score > 40 ? "Moderately open to experiences" : 
          "Prefers familiar and traditional solutions"
    },
    conscientiousness: {
      pl: score > 70 ? "Bardzo zorganizowany i sumienny" : 
          score > 40 ? "Umiarkowanie zorganizowany" : 
          "Elastyczny i spontaniczny",
      en: score > 70 ? "Very organized and conscientious" : 
          score > 40 ? "Moderately organized" : 
          "Flexible and spontaneous"
    },
    extraversion: {
      pl: score > 70 ? "Bardzo towarzyski i energiczny" : 
          score > 40 ? "Umiarkowanie towarzyski" : 
          "Cichy i zarezerwowany",
      en: score > 70 ? "Very sociable and energetic" : 
          score > 40 ? "Moderately sociable" : 
          "Quiet and reserved"
    },
    agreeableness: {
      pl: score > 70 ? "Bardzo ugodowy i współczujący" : 
          score > 40 ? "Umiarkowanie ugodowy" : 
          "Asertywny i bezpośredni",
      en: score > 70 ? "Very agreeable and compassionate" : 
          score > 40 ? "Moderately agreeable" : 
          "Assertive and direct"
    },
    neuroticism: {
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
