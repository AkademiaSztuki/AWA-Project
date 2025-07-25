'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from '@/hooks';
import { AwaContainer } from '@/components/awa/AwaContainer';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { ArrowRight, Heart, Users, Zap, Home, Brain, Shield, Leaf, Ruler, Palette, Sun, Sprout, Gem, Hand, Eye, Globe, Smile, Briefcase, Book, Tag, Star } from 'lucide-react';

interface LadderStep {
  level: number;
  question: string;
  options: Array<{
    id: string;
    text: string;
    icon: React.ReactNode;
    nextQuestion?: string;
    deeperNeed?: string;
  }>;
}

const LADDER_QUESTIONS: LadderStep[] = [
  {
    level: 1,
    question: "Co najbardziej przyciąga Cię w Twoim wymarzonej przestrzeni?",
    options: [
      {
        id: "organic_shapes",
        text: "Organiczne kształty i naturalne formy",
        icon: <Leaf className="text-gold" size={28} />,
        nextQuestion: "organic_why"
      },
      {
        id: "clean_lines", 
        text: "Czyste linie i geometryczne formy",
        icon: <Ruler className="text-gold" size={28} />,
        nextQuestion: "clean_why"
      },
      {
        id: "rich_textures",
        text: "Bogate tekstury i materiały",
        icon: <Palette className="text-gold" size={28} />,
        nextQuestion: "texture_why"
      },
      {
        id: "natural_light",
        text: "Naturalne światło i otwarta przestrzeń", 
        icon: <Sun className="text-gold" size={28} />,
        nextQuestion: "light_why"
      }
    ]
  }
];

const LEVEL_2_QUESTIONS: Record<string, LadderStep> = {
  organic_why: {
    level: 2,
    question: "Dlaczego organiczne kształty są dla Ciebie ważne?",
    options: [
      {
        id: "calming",
        text: "Tworzą poczucie spokoju i harmonii",
        icon: <Heart className="w-6 h-6" />, nextQuestion: "calm_deeper"
      },
      {
        id: "natural_connection",
        text: "Łączą mnie z naturą",
        icon: <Sprout className="text-gold" size={28} />, nextQuestion: "nature_deeper"
      },
      {
        id: "unique_character",
        text: "Dają przestrzeni unikalny charakter",
        icon: <Zap className="w-6 h-6" />, nextQuestion: "character_deeper"
      }
    ]
  },
  clean_why: {
    level: 2,
    question: "Co dają Ci czyste, geometryczne formy?",
    options: [
      {
        id: "order_focus",
        text: "Pomagają mi się skupić i organizować myśli",
        icon: <Brain className="w-6 h-6" />,
        nextQuestion: "focus_deeper"
      },
      {
        id: "timeless_elegance",
        text: "Zapewniają ponadczasową elegancję",
        icon: <Gem className="text-gold" size={28} />,
        nextQuestion: "elegance_deeper"
      },
      {
        id: "simple_maintenance",
        text: "Są proste w utrzymaniu",
        icon: <Shield className="w-6 h-6" />,
        nextQuestion: "simplicity_deeper"
      }
    ]
  },
  texture_why: {
    level: 2,
    question: "Dlaczego bogate tekstury są dla Ciebie istotne?",
    options: [
      {
        id: "sensory_experience",
        text: "Tworzą bogatsze doświadczenie zmysłowe",
        icon: <Hand className="text-gold" size={28} />,
        nextQuestion: "sensory_deeper"
      },
      {
        id: "warmth_comfort",
        text: "Dodają ciepła i przytulności",
        icon: <Heart className="w-6 h-6" />,
        nextQuestion: "comfort_deeper"
      },
      {
        id: "visual_interest",
        text: "Czynią przestrzeń bardziej interesującą wizualnie",
        icon: <Eye className="text-gold" size={28} />,
        nextQuestion: "visual_deeper"
      }
    ]
  },
  light_why: {
    level: 2,
    question: "Co oznacza dla Ciebie naturalne światło?",
    options: [
      {
        id: "energy_mood",
        text: "Poprawia mój nastrój i dodaje energii",
        icon: <Zap className="text-gold" size={28} />,
        nextQuestion: "energy_deeper"
      },
      {
        id: "connection_outside",
        text: "Łączy wnętrze ze światem zewnętrznym",
        icon: <Globe className="text-gold" size={28} />,
        nextQuestion: "connection_deeper"
      },
      {
        id: "spaciousness",
        text: "Sprawia, że przestrzeń wydaje się większa",
        icon: <Home className="w-6 h-6" />,
        nextQuestion: "space_deeper"
      }
    ]
  }
};

const LEVEL_3_QUESTIONS: Record<string, LadderStep> = {
  calm_deeper: {
    level: 3,
    question: "A dlaczego spokój w przestrzeni jest kluczowy dla Ciebie?",
    options: [
      {
        id: "rest_recharge",
        text: "Aby odpocząć po intensywnym dniu",
        icon: <Smile className="text-gold" size={28} />,
        deeperNeed: "regeneration"
      },
      {
        id: "creative_thinking",
        text: "Żeby lepiej myśleć i być kreatywnym",
        icon: <Brain className="w-6 h-6" />,
        deeperNeed: "creativity"
      },
      {
        id: "family_harmony",
        text: "Aby stworzyć harmonijną przestrzeń dla rodziny",
        icon: <Users className="w-6 h-6" />,
        deeperNeed: "family_bonding"
      }
    ]
  },
  focus_deeper: {
    level: 3,
    question: "Dlaczego skupienie w przestrzeni jest dla Ciebie priorytetem?",
    options: [
      {
        id: "work_productivity",
        text: "Aby być bardziej produktywnym w pracy",
        icon: <Briefcase className="text-gold" size={28} />,
        deeperNeed: "achievement"
      },
      {
        id: "learning_growth",
        text: "Żeby lepiej się uczyć i rozwijać",
        icon: <Book className="text-gold" size={28} />,
        deeperNeed: "self_development"
      },
      {
        id: "mental_clarity",
        text: "Aby mieć jasność myślenia",
        icon: <Brain className="w-6 h-6" />,
        deeperNeed: "mental_wellness"
      }
    ]
  },
  comfort_deeper: {
    level: 3,
    question: "Co oznacza dla Ciebie prawdziwa przytulność?",
    options: [
      {
        id: "emotional_safety",
        text: "Poczucie bezpieczeństwa emocjonalnego",
        icon: <Shield className="w-6 h-6" />,
        deeperNeed: "security"
      },
      {
        id: "authentic_self",
        text: "Miejsce gdzie mogę być sobą",
        icon: <Heart className="w-6 h-6" />,
        deeperNeed: "authenticity"
      },
      {
        id: "social_connection",
        text: "Przestrzeń do dzielenia się z bliskimi",
        icon: <Users className="w-6 h-6" />,
        deeperNeed: "connection"
      }
    ]
  },
  nature_deeper: {
    level: 3,
    question: "Co daje Ci poczucie połączenia z naturą?",
    options: [
      {
        id: "calm_nature",
        text: "Spokój i harmonia",
        icon: <Smile className="text-gold" size={28} />,
        deeperNeed: "regeneration"
      },
      {
        id: "inspiration_nature",
        text: "Inspiracja i kreatywność",
        icon: <Star className="text-gold" size={28} />,
        deeperNeed: "creativity"
      },
      {
        id: "belonging_nature",
        text: "Poczucie przynależności",
        icon: <Users className="text-gold" size={28} />,
        deeperNeed: "connection"
      }
    ]
  },
  character_deeper: {
    level: 3,
    question: "Co oznacza dla Ciebie unikalny charakter przestrzeni?",
    options: [
      {
        id: "express_self",
        text: "Możliwość wyrażenia siebie",
        icon: <Star className="text-gold" size={28} />,
        deeperNeed: "authenticity"
      },
      {
        id: "stand_out",
        text: "Wyróżnienie się spośród innych",
        icon: <Gem className="text-gold" size={28} />,
        deeperNeed: "creativity"
      },
      {
        id: "inspire_others",
        text: "Inspirowanie innych",
        icon: <Users className="text-gold" size={28} />,
        deeperNeed: "connection"
      }
    ]
  },
  energy_deeper: {
    level: 3,
    question: "Co daje Ci energię i poprawia nastrój w przestrzeni?",
    options: [
      {
        id: "natural_light",
        text: "Dużo naturalnego światła",
        icon: <Sun className="text-gold" size={28} />,
        deeperNeed: "regeneration"
      },
      {
        id: "dynamic_colors",
        text: "Żywe kolory i kontrasty",
        icon: <Palette className="text-gold" size={28} />,
        deeperNeed: "creativity"
      },
      {
        id: "open_space",
        text: "Otwarta, przestronna aranżacja",
        icon: <Home className="text-gold" size={28} />,
        deeperNeed: "connection"
      }
    ]
  },
  connection_deeper: {
    level: 3,
    question: "Co daje Ci poczucie połączenia ze światem zewnętrznym?",
    options: [
      {
        id: "big_windows",
        text: "Duże okna i widok na zieleń",
        icon: <Eye className="text-gold" size={28} />,
        deeperNeed: "regeneration"
      },
      {
        id: "balkon",
        text: "Wyjście na balkon/taras",
        icon: <Home className="text-gold" size={28} />,
        deeperNeed: "connection"
      },
      {
        id: "natural_materials",
        text: "Naturalne materiały i rośliny",
        icon: <Sprout className="text-gold" size={28} />,
        deeperNeed: "authenticity"
      }
    ]
  },
  space_deeper: {
    level: 3,
    question: "Co sprawia, że przestrzeń wydaje się większa?",
    options: [
      {
        id: "minimalism",
        text: "Minimalistyczny wystrój",
        icon: <Ruler className="text-gold" size={28} />,
        deeperNeed: "regeneration"
      },
      {
        id: "mirrors",
        text: "Lustra i jasne kolory",
        icon: <Gem className="text-gold" size={28} />,
        deeperNeed: "creativity"
      },
      {
        id: "open_layout",
        text: "Otwarty układ pomieszczeń",
        icon: <Home className="text-gold" size={28} />,
        deeperNeed: "connection"
      }
    ]
  },
  elegance_deeper: {
    level: 3,
    question: "Co oznacza dla Ciebie ponadczasowa elegancja?",
    options: [
      {
        id: "classic_forms",
        text: "Klasyczne formy i detale",
        icon: <Gem className="text-gold" size={28} />,
        deeperNeed: "authenticity"
      },
      {
        id: "quality_materials",
        text: "Wysokiej jakości materiały",
        icon: <Hand className="text-gold" size={28} />,
        deeperNeed: "regeneration"
      },
      {
        id: "timeless_colors",
        text: "Stonowana, ponadczasowa kolorystyka",
        icon: <Palette className="text-gold" size={28} />,
        deeperNeed: "creativity"
      }
    ]
  },
  simplicity_deeper: {
    level: 3,
    question: "Co oznacza dla Ciebie prostota w utrzymaniu?",
    options: [
      {
        id: "easy_clean",
        text: "Łatwość sprzątania",
        icon: <Shield className="text-gold" size={28} />,
        deeperNeed: "regeneration"
      },
      {
        id: "few_decorations",
        text: "Mało dekoracji, proste formy",
        icon: <Ruler className="text-gold" size={28} />,
        deeperNeed: "authenticity"
      },
      {
        id: "functional_layout",
        text: "Funkcjonalny układ",
        icon: <Home className="text-gold" size={28} />,
        deeperNeed: "connection"
      }
    ]
  },
  sensory_deeper: {
    level: 3,
    question: "Co jest dla Ciebie najważniejsze w doświadczaniu zmysłowym?",
    options: [
      {
        id: "touch",
        text: "Przyjemne w dotyku materiały",
        icon: <Hand className="text-gold" size={28} />,
        deeperNeed: "regeneration"
      },
      {
        id: "smell",
        text: "Zapachy (np. drewno, tkaniny)",
        icon: <Sprout className="text-gold" size={28} />,
        deeperNeed: "authenticity"
      },
      {
        id: "visual_variety",
        text: "Różnorodność faktur i kolorów",
        icon: <Palette className="text-gold" size={28} />,
        deeperNeed: "creativity"
      }
    ]
  },
  visual_deeper: {
    level: 3,
    question: "Co sprawia, że przestrzeń jest wizualnie interesująca?",
    options: [
      {
        id: "art",
        text: "Obecność sztuki i dekoracji",
        icon: <Star className="text-gold" size={28} />,
        deeperNeed: "creativity"
      },
      {
        id: "contrasts",
        text: "Kontrasty kolorów i materiałów",
        icon: <Palette className="text-gold" size={28} />,
        deeperNeed: "authenticity"
      },
      {
        id: "unique_furniture",
        text: "Unikalne meble i dodatki",
        icon: <Gem className="text-gold" size={28} />,
        deeperNeed: "regeneration"
      }
    ]
  }
};

const CORE_NEEDS_DESCRIPTIONS: Record<string, string> = {
  regeneration: "Regeneracja i Odnowa",
  creativity: "Kreatywność i Ekspresja",
  family_bonding: "Więzi Rodzinne",
  achievement: "Osiągnięcia i Sukces",
  self_development: "Rozwój Osobisty",
  mental_wellness: "Zdrowie Psychiczne",
  security: "Bezpieczeństwo Emocjonalne",
  authenticity: "Autentyczność",
  connection: "Więzi Społeczne"
};

export default function LadderOfNeedsPage() {
  const router = useRouter();
  const { sessionData, updateSession } = useSession();
  const [currentStep, setCurrentStep] = useState<LadderStep>(LADDER_QUESTIONS[0]);
  const [ladderPath, setLadderPath] = useState<Array<{
    level: number;
    question: string;
    selectedAnswer: string;
    timestamp: string;
  }>>([]);
  const [coreNeed, setCoreNeed] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const handleOptionSelect = async (option: typeof currentStep.options[0]) => {
    const newPathItem = {
      level: currentStep.level,
      question: currentStep.question,
      selectedAnswer: option.text,
      timestamp: new Date().toISOString(),
    };

    const updatedPath = [...ladderPath, newPathItem];
    setLadderPath(updatedPath);

    // Save progress
    await updateSession({
      ladderResults: updatedPath,
    });

    if (option.deeperNeed) {
      // Reached core need
      setCoreNeed(option.deeperNeed);
      setIsComplete(true);
      // Możesz dodać tu inny zapis, jeśli chcesz, ale nie do sesji
    } else if (option.nextQuestion) {
      // Continue to next level
      const nextQuestion = currentStep.level === 1 
        ? LEVEL_2_QUESTIONS[option.nextQuestion]
        : LEVEL_3_QUESTIONS[option.nextQuestion];
      if (nextQuestion) {
        setTimeout(() => {
          setCurrentStep(nextQuestion);
        }, 500);
      }
    }
  };

  const handleContinue = () => {
    router.push('/flow/generate');
  };

  const getAwaDialogue = () => {
    if (isComplete && coreNeed) {
      return {
        text: `Teraz rozumiem! Twoja podstawowa potrzeba to ${CORE_NEEDS_DESCRIPTIONS[coreNeed]}. To będzie sercem naszego projektu.`,
        emotion: "understanding" as const
      };
    }
    
    switch (currentStep.level) {
      case 1:
        return {
          text: "Opowiedz mi, co Cię pociąga. Nie ma dobrych czy złych odpowiedzi - po prostu wybierz to, co rezonuje z Tobą najbardziej.",
          emotion: "curious" as const
        };
      case 2:
        return {
          text: "Zgłębiamy dalej... Dlaczego ten element jest dla Ciebie ważny?",
          emotion: "investigating" as const
        };
      case 3:
        return {
          text: "A teraz najgłębiej... Co to naprawdę znaczy dla Ciebie w życiu codziennym?",
          emotion: "deep_focus" as const
        };
      default:
        return {
          text: "Odkrywajmy razem, co naprawdę motywuje Twoje wybory designerskie...",
          emotion: "encouraging" as const
        };
    }
  };

  const getProgressPercentage = () => {
    if (isComplete) return 100;
    // 0% na starcie, 33% po 1, 66% po 2, 100% po 3
    const steps = ladderPath.length;
    if (steps === 0) return 0;
    if (steps === 1) return 33;
    if (steps === 2) return 66;
    return 100;
  };

  return (
    <div className="min-h-screen bg-gradient-radial from-pearl-50 to-platinum-100 p-4">
      <div className="h-full w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full"
        >
          <div className="mb-8 min-h-[120px]">
            <div className="text-center mb-6">
              <h1 className={`text-4xl font-bold bg-gradient-to-r from-gold to-champagne bg-clip-text text-transparent mb-2 ${isComplete ? 'invisible' : ''}`}>
                Drabina Potrzeb
              </h1>
            </div>
            <div className={`mb-4 ${isComplete ? 'invisible' : ''}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-silver-dark">Poziom {currentStep.level} z 3</span>
                <span className="text-sm text-silver-dark">
                  {getProgressPercentage()}% ukończone
                </span>
              </div>
              <div className="w-full bg-silver/20 rounded-full h-2">
                <motion.div
                  className="bg-gradient-to-r from-gold to-champagne h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${getProgressPercentage()}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {!isComplete ? (
              <motion.div
                key={currentStep.level}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4 }}
              >
                <GlassCard className="p-8">
                  
                  {/* Question */}
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-graphite mb-4">
                      {currentStep.question}
                    </h2>
                    
                    {/* 1. Etykieta Atrybut/Korzyść/Wartość - jednolity styl */}
                    {/* 1. Usuń baton pod napisami Atrybut/Korzyść/Wartość */}
                    {/* Zamiast:
                    <div className="glass-panel bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl rounded-[32px] text-gold flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium mb-4">
                      {currentStep.level === 1 ? <Tag className="text-gold" size={18} /> :
                       currentStep.level === 2 ? <Star className="text-gold" size={18} /> :
                       <Heart className="text-gold" size={18} />}
                      {currentStep.level === 1 ? 'Atrybut' :
                       currentStep.level === 2 ? 'Korzyść' : 
                       'Wartość'}
                    </div>
                    */}
                  </div>

                  {/* Options */}
                  <div className="grid gap-4 max-w-3xl mx-auto">
                    {currentStep.options.map((option, index) => (
                      <motion.div
                        key={option.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <GlassButton
                          onClick={() => handleOptionSelect(option)}
                          variant="secondary"
                          className="w-full p-6 text-left h-auto"
                        >
                          <div className="flex items-center space-x-4">
                            <div className="flex-shrink-0 w-12 h-12 bg-gold/10 rounded-full flex items-center justify-center">
                              {option.icon}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-graphite text-lg">
                                {option.text}
                              </p>
                            </div>
                            <ArrowRight className="flex-shrink-0 text-silver opacity-50" size={20} />
                          </div>
                        </GlassButton>
                      </motion.div>
                    ))}
                  </div>

                </GlassCard>
              </motion.div>
            ) : (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
              >
                <GlassCard className={`p-8 text-center w-full ${isComplete ? '-mt-24' : ''}`}>
                  
                  {/* Success Animation */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5, type: "spring" }}
                    className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-gold to-champagne rounded-full flex items-center justify-center"
                  >
                    <Heart className="text-white" size={48} />
                  </motion.div>

                  <h2 className="text-3xl font-bold text-graphite mb-4">
                    Odkryliśmy Twój Rdzeń!
                  </h2>

                  <div className="mb-6">
                    <div className="inline-block glass-panel bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl rounded-[32px] p-6">
                      <h3 className="text-2xl font-bold text-black">
                        {coreNeed && CORE_NEEDS_DESCRIPTIONS[coreNeed]}
                      </h3>
                    </div>
                  </div>

                  <p className="text-lg text-silver-dark mb-8 max-w-2xl mx-auto">
                    To jest serce Twojego projektu. Każda decyzja designerska będzie służyć tej fundamentalnej potrzebie.
                  </p>

                  {/* Journey Recap */}
                  <div className="mb-8">
                    <h4 className="font-semibold text-graphite mb-4">Twoja Podróż:</h4>
                    <div className="space-y-2 text-left max-w-2xl mx-auto">
                      {ladderPath.map((step, index) => (
                        <div key={index} className="flex items-start space-x-3 p-3 bg-white/10 rounded-lg">
                          <div className="flex-shrink-0 w-6 h-6 bg-gold text-black text-xs rounded-full flex items-center justify-center font-bold">
                            {step.level}
                          </div>
                          <div>
                            <p className="text-sm text-silver-dark">{step.question}</p>
                            <p className="font-medium text-graphite">{step.selectedAnswer}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Continue Button */}
                  <GlassButton
                    onClick={handleContinue}
                    size="lg"
                    className="px-8 py-4 font-semibold"
                  >
                    <span className="flex items-center space-x-2">
                      <span>Stwórzmy Twoje Wnętrza</span>
                      <ArrowRight size={20} />
                    </span>
                  </GlassButton>

                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>
      </div>
    </div>
  );
}
