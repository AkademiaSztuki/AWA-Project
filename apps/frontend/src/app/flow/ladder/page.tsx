'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from '@/hooks';
import { getOrCreateProjectId, logBehavioralEvent } from '@/lib/supabase';
import { AwaContainer, AwaDialogue } from '@/components/awa';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { stopAllDialogueAudio } from '@/hooks/useAudioManager';
import { ArrowRight, Heart, Users, Zap, Home, Brain, Shield, Leaf, Ruler, Palette, Sun, Sprout, Gem, Hand, Eye, Globe, Smile, Briefcase, Book, Tag, Star, Clock, User, GraduationCap } from 'lucide-react';

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

interface DemographicStep {
  type: 'demographic';
  question: string;
  options: Array<{
    id: string;
    text: string;
    icon: React.ReactNode;
  }>;
}

interface UsageStep {
  type: 'usage';
  question: string;
  options: Array<{
    id: string;
    text: string;
    icon: React.ReactNode;
  }>;
}

interface EmotionalStep {
  type: 'emotional';
  question: string;
  options: Array<{
    id: string;
    text: string;
    icon: React.ReactNode;
    emotion: string;
  }>;
}

// Core needs mapping to specific FLUX prompt elements
const CORE_NEED_TO_PROMPT = {
  regeneration: {
    atmosphere: "calming and peaceful atmosphere",
    colors: "soft, muted colors with warm undertones, gentle pastels", 
    lighting: "gentle, diffused natural lighting, warm ambient light",
    materials: "natural textures, soft fabrics, organic materials, wood and stone",
    layout: "uncluttered, harmonious arrangement with comfortable seating areas",
    mood: "serene, restful, spa-like tranquility"
  },
  creativity: {
    atmosphere: "inspiring and energizing environment",
    colors: "vibrant accent colors with artistic elements, bold contrasts",
    lighting: "dynamic lighting with task illumination, adjustable brightness", 
    materials: "mixed textures, artistic materials, unique finishes, creative surfaces",
    layout: "flexible, dynamic arrangement with creative zones and workspace areas",
    mood: "stimulating, artistic, inspiring creativity"
  },
  family_bonding: {
    atmosphere: "warm and welcoming family space",
    colors: "warm, inviting colors that encourage togetherness",
    lighting: "soft, warm lighting perfect for family gatherings",
    materials: "comfortable, durable materials suitable for family life",
    layout: "open, social arrangement encouraging interaction and togetherness",
    mood: "cozy, family-friendly, nurturing environment"
  },
  achievement: {
    atmosphere: "professional and focused workspace environment",
    colors: "sophisticated, professional color palette with success-oriented tones",
    lighting: "bright, focused task lighting optimized for productivity",
    materials: "premium, professional materials conveying success and quality",
    layout: "organized, efficient arrangement supporting productivity and focus",
    mood: "professional, ambitious, success-oriented atmosphere"
  },
  self_development: {
    atmosphere: "quiet and contemplative learning environment",
    colors: "calming, study-friendly colors that support concentration",
    lighting: "optimal reading and study lighting, adjustable for different activities",
    materials: "comfortable, study-supportive materials and surfaces",
    layout: "organized learning space with areas for reading, writing, and reflection",
    mood: "focused, studious, growth-oriented atmosphere"
  },
  mental_wellness: {
    atmosphere: "balanced environment supporting mental health and wellbeing",
    colors: "psychologically balanced colors promoting mental wellness",
    lighting: "natural light with mood-supporting artificial lighting",
    materials: "wellness-promoting natural materials and textures",
    layout: "balanced, harmonious arrangement supporting mental clarity",
    mood: "balanced, mentally restorative, wellness-focused"
  },
  security: {
    atmosphere: "safe and comfortable sanctuary space",
    colors: "secure, grounding colors that provide emotional stability",
    lighting: "warm, secure lighting creating a safe haven feeling",
    materials: "solid, trustworthy materials providing sense of security",
    layout: "protective, enclosed arrangement with clear boundaries and privacy",
    mood: "safe, secure, emotionally protected environment"
  },
  authenticity: {
    atmosphere: "genuine space reflecting individual personality and values",
    colors: "personally meaningful colors that reflect true self-expression",
    lighting: "authentic lighting that supports genuine self-expression",
    materials: "meaningful materials with personal significance and character",
    layout: "honest, unpretentious arrangement reflecting personal lifestyle",
    mood: "genuine, authentic, personally meaningful atmosphere"
  },
  connection: {
    atmosphere: "social and inviting space ideal for relationships and community",
    colors: "welcoming, social colors that encourage interaction and connection",
    lighting: "warm, social lighting perfect for entertaining and gathering",
    materials: "inviting, comfortable materials that welcome guests and social interaction",
    layout: "social arrangement optimized for conversation and community building",
    mood: "welcoming, social, community-oriented atmosphere"
  }
};

// --- PYTANIA (LADDER, USAGE, EMOTIONAL, DEMOGRAPHIC) ---
const LADDER_QUESTIONS: LadderStep[] = [
  {
    level: 1,
    question: "Co najbardziej przyciąga Cię w Twojej wymarzonej przestrzeni?",
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
        icon: <Heart className="w-6 h-6" />, 
        nextQuestion: "calm_deeper"
      },
      {
        id: "natural_connection",
        text: "Łączą mnie z naturą",
        icon: <Sprout className="text-gold" size={28} />, 
        nextQuestion: "nature_deeper"
      },
      {
        id: "unique_character",
        text: "Dają przestrzeni unikalny charakter",
        icon: <Zap className="w-6 h-6" />, 
        nextQuestion: "character_deeper"
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

// Usage patterns questions
const USAGE_QUESTIONS: UsageStep = {
  type: 'usage',
  question: "W jakich momentach dnia najczęściej korzystasz z tego pomieszczenia?",
  options: [
    {
      id: "morning",
      text: "Rano (6:00-12:00) - śniadanie, poranna rutyna", 
      icon: <Sun className="text-gold" size={28} />
    },
    {
      id: "afternoon", 
      text: "Popołudniu (12:00-18:00) - praca, aktywności dzienne",
      icon: <Briefcase className="text-gold" size={28} />
    },
    {
      id: "evening",
      text: "Wieczorem (18:00-22:00) - relaks, posiłki, towarzystwo",
      icon: <Heart className="text-gold" size={28} />
    },
    {
      id: "night",
      text: "Nocą (22:00-6:00) - odpoczynek, sen",
      icon: <Smile className="text-gold" size={28} />
    }
  ]
};

// Emotional validation questions
const EMOTIONAL_QUESTIONS: EmotionalStep = {
  type: 'emotional',
  question: "Gdy myślisz o tej przestrzeni, jakie emocje chcesz przede wszystkim odczuwać?",
  options: [
    {
      id: "peace",
      text: "Spokój i wewnętrzną harmonię",
      icon: <Heart className="text-gold" size={28} />,
      emotion: "peaceful"
    },
    {
      id: "energy", 
      text: "Energię i motywację do działania",
      icon: <Zap className="text-gold" size={28} />,
      emotion: "energetic"
    },
    {
      id: "joy",
      text: "Radość i pozytywne nastawienie",
      icon: <Smile className="text-gold" size={28} />,
      emotion: "joyful"
    },
    {
      id: "focus",
      text: "Koncentrację i jasność myślenia",
      icon: <Brain className="text-gold" size={28} />,
      emotion: "focused"
    }
  ]
};

// Demographics questions
const DEMOGRAPHIC_QUESTIONS: DemographicStep[] = [
  {
    type: 'demographic',
    question: "Jaka jest Twoja grupa wiekowa?",
    options: [
      { id: "18-25", text: "18-25 lat", icon: <User className="text-gold" size={28} /> },
      { id: "26-35", text: "26-35 lat", icon: <User className="text-gold" size={28} /> },
      { id: "36-45", text: "36-45 lat", icon: <User className="text-gold" size={28} /> },
      { id: "46-55", text: "46-55 lat", icon: <User className="text-gold" size={28} /> },
      { id: "56+", text: "56+ lat", icon: <User className="text-gold" size={28} /> }
    ]
  },
  {
    type: 'demographic', 
    question: "Jakie masz doświadczenie z projektowaniem wnętrz?",
    options: [
      { id: "none", text: "Żadne - to moja pierwsza próba", icon: <Home className="text-gold" size={28} /> },
      { id: "amateur", text: "Amatorskie - interesuję się designem", icon: <Eye className="text-gold" size={28} /> },
      { id: "student", text: "Studiuję design lub architekturę", icon: <GraduationCap className="text-gold" size={28} /> },
      { id: "professional", text: "Jestem profesjonalistą w branży", icon: <Briefcase className="text-gold" size={28} /> }
    ]
  },
  {
    type: 'demographic',
    question: "Jaka jest Twoja sytuacja mieszkaniowa?",
    options: [
      { id: "alone", text: "Mieszkam sam/sama", icon: <Home className="text-gold" size={28} /> },
      { id: "couple", text: "Mieszkam z partnerem/partnerką", icon: <Users className="text-gold" size={28} /> },
      { id: "family", text: "Mieszkam z rodziną (z dziećmi)", icon: <Heart className="text-gold" size={28} /> },
      { id: "shared", text: "Mieszkam współdzielnie (współlokatorzy)", icon: <Users className="text-gold" size={28} /> }
    ]
  }
];

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

type CurrentStepType = LadderStep | UsageStep | EmotionalStep | DemographicStep;

// --- STAN I LOGIKA PRZECHODZENIA ---
export default function LadderOfNeedsPage() {
  const router = useRouter();
  const { sessionData, updateSession } = useSession();
  const [currentStep, setCurrentStep] = useState<CurrentStepType>(LADDER_QUESTIONS[0]);
  const [ladderPath, setLadderPath] = useState<Array<{
    level: number;
    question: string;
    selectedAnswer: string;
    selectedId: string;
    timestamp: string;
  }>>([]);
  const [coreNeed, setCoreNeed] = useState<string | null>(null);
  const [usagePattern, setUsagePattern] = useState<string | null>(null);
  const [emotionalPreference, setEmotionalPreference] = useState<string | null>(null);
  const [demographics, setDemographics] = useState<Record<string, string>>({});
  const [currentDemographicIndex, setCurrentDemographicIndex] = useState(0);
  const [phase, setPhase] = useState<'ladder' | 'usage' | 'emotional' | 'demographic' | 'complete'>('ladder');

  const handleOptionSelect = async (option: any) => {
    if (phase === 'ladder') {
      const newPathItem = {
        level: (currentStep as LadderStep).level,
        question: (currentStep as LadderStep).question,
        selectedAnswer: option.text,
        selectedId: option.id,
        timestamp: new Date().toISOString(),
      };

      const updatedPath = [...ladderPath, newPathItem];
      setLadderPath(updatedPath);

      if (option.deeperNeed) {
        // Reached core need
        setCoreNeed(option.deeperNeed);
        
        // Save ladder results with prompt mapping
        await updateSession({
          ladderResults: {
            path: updatedPath,
            coreNeed: option.deeperNeed,
            promptElements: CORE_NEED_TO_PROMPT[option.deeperNeed as keyof typeof CORE_NEED_TO_PROMPT]
          }
        });
        try {
          const projectId = await getOrCreateProjectId((sessionData as any).userHash);
          if (projectId) {
            await logBehavioralEvent(projectId, 'ladder_core_need', {
              coreNeed: option.deeperNeed,
              path: updatedPath,
              promptElements: CORE_NEED_TO_PROMPT[option.deeperNeed as keyof typeof CORE_NEED_TO_PROMPT],
            });
          }
        } catch (e) { /* ignore */ }

        // Move to usage questions
        setPhase('usage');
        setCurrentStep(USAGE_QUESTIONS);
      } else if (option.nextQuestion) {
        // Continue to next level
        const nextQuestion = (currentStep as LadderStep).level === 1 
          ? LEVEL_2_QUESTIONS[option.nextQuestion]
          : LEVEL_3_QUESTIONS[option.nextQuestion];
        if (nextQuestion) {
          setTimeout(() => {
            setCurrentStep(nextQuestion);
          }, 500);
        }
      }
    } else if (phase === 'usage') {
      setUsagePattern(option.id);
      
      // Save usage pattern
      await updateSession({
        usagePattern: {
          timeOfDay: option.id,
          description: option.text,
          timestamp: new Date().toISOString()
        }
      });
      try {
        const projectId = await getOrCreateProjectId((sessionData as any).userHash);
        if (projectId) {
          await logBehavioralEvent(projectId, 'usage_pattern', {
            timeOfDay: option.id,
            description: option.text,
          });
        }
      } catch (e) { /* ignore */ }

      // Move to emotional questions
      setPhase('emotional');
      setCurrentStep(EMOTIONAL_QUESTIONS);
    } else if (phase === 'emotional') {
      setEmotionalPreference(option.emotion);

      // Save emotional preference
      await updateSession({
        emotionalPreference: {
          emotion: option.emotion,
          description: option.text,
          timestamp: new Date().toISOString()
        }
      });
      try {
        const projectId = await getOrCreateProjectId((sessionData as any).userHash);
        if (projectId) {
          await logBehavioralEvent(projectId, 'emotional_preference', {
            emotion: option.emotion,
            description: option.text,
          });
        }
      } catch (e) { /* ignore */ }

      // Move to demographics
      setPhase('demographic');
      setCurrentStep(DEMOGRAPHIC_QUESTIONS[0]);
    } else if (phase === 'demographic') {
      const newDemographics = { 
        ...demographics, 
        [DEMOGRAPHIC_QUESTIONS[currentDemographicIndex].question]: option.id 
      };
      setDemographics(newDemographics);

      if (currentDemographicIndex < DEMOGRAPHIC_QUESTIONS.length - 1) {
        // Next demographic question
        setCurrentDemographicIndex(currentDemographicIndex + 1);
        setCurrentStep(DEMOGRAPHIC_QUESTIONS[currentDemographicIndex + 1]);
      } else {
        // All done, save demographics and complete
        await updateSession({
          demographics: newDemographics,
          ladderCompleteTime: new Date().toISOString()
        });
        try {
          const projectId = await getOrCreateProjectId((sessionData as any).userHash);
          if (projectId) {
            await logBehavioralEvent(projectId, 'demographics', newDemographics);
          }
        } catch (e) { /* ignore */ }

        setPhase('complete');
      }
    }
  };

  const handleContinue = () => {
    stopAllDialogueAudio(); // Zatrzymaj dźwięk przed nawigacją
    router.push('/flow/generate');
  };

  const getAwaDialogue = () => {
    if (phase === 'complete' && coreNeed) {
      return {
        text: `Teraz rozumiem! Twoja podstawowa potrzeba to ${CORE_NEEDS_DESCRIPTIONS[coreNeed]}. Będziemy tworzyć przestrzeń idealną dla ${usagePattern === 'morning' ? 'porannych chwil' : usagePattern === 'evening' ? 'wieczornego relaksu' : 'Twoich potrzeb'}. To będzie sercem naszego projektu.`,
        emotion: "understanding" as const
      };
    }
    
    if (phase === 'usage') {
      return {
        text: "Teraz powiedz mi, kiedy najczęściej będziesz korzystać z tej przestrzeni? To pomoże mi dostosować oświetlenie i atmosferę.",
        emotion: "practical" as const
      };
    }

    if (phase === 'emotional') {
      return {
        text: "Jakie emocje mają być sercem tej przestrzeni? Twoje odczucia pomogą mi stworzyć idealną atmosferę.",
        emotion: "empathetic" as const
      };
    }

    if (phase === 'demographic') {
      return {
        text: "Ostatnie pytania to formalność do badania. Dzięki nim lepiej zrozumiem kontekst Twoich wyborów.",
        emotion: "reassuring" as const
      };
    }
    
    switch ((currentStep as LadderStep).level) {
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
    if (phase === 'complete') return 100;
    
    // Total phases: ladder (3 steps) + usage (1) + emotional (1) + demographics (3) = 8 steps
    let progress = 0;
    
    if (phase === 'ladder') {
      progress = (ladderPath.length / 8) * 100; // 3 steps out of 8 total
    } else if (phase === 'usage') {
      progress = 37.5; // 3/8 completed
    } else if (phase === 'emotional') {
      progress = 50; // 4/8 completed  
    } else if (phase === 'demographic') {
      progress = 62.5 + ((currentDemographicIndex + 1) / 3) * 25; // 5-8/8 completed
    }
    
    return Math.round(progress);
  };

  const getPhaseTitle = () => {
    switch (phase) {
      case 'ladder': return "Drabina Potrzeb";
      case 'usage': return "Wzorce Użytkowania";
      case 'emotional': return "Preferencje Emocjonalne";  
      case 'demographic': return "Kontekst Badawczy";
      default: return "Drabina Potrzeb";
    }
  };

  return (
    <div className="min-h-screen flex flex-col w-full">
      <div className="flex-1 bg-gradient-radial from-pearl-50 to-platinum-100 p-4">
        <div className="h-full w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full"
        >
          <div className="mb-8 min-h-[120px]">
            <div className="text-center mb-6">
              <h1 className={`text-4xl font-bold bg-gradient-to-r from-gold to-champagne bg-clip-text text-transparent mb-2 ${phase === 'complete' ? 'invisible' : ''}`}>
                {getPhaseTitle()}
              </h1>
            </div>
            <div className={`mb-4 ${phase === 'complete' ? 'invisible' : ''}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-silver-dark">Poziom {(currentStep as LadderStep).level} z 3</span>
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
            {phase !== 'complete' ? (
              <motion.div
                key={(currentStep as LadderStep).level}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4 }}
              >
                <GlassCard className="p-8">
                  
                  {/* Question */}
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-graphite mb-4">
                      {(currentStep as LadderStep).question}
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
                    {(currentStep as LadderStep).options.map((option, index) => (
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
                <GlassCard className={`p-8 text-center w-full ${phase === 'complete' ? '-mt-24' : ''}`}>
                  
                  {/* Success Animation */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5, type: "spring" }}
                    className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-gold to-champagne rounded-full flex items-center justify-center"
                  >
                    <Star className="text-white" size={48} />
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

      {/* Dialog AWA na dole - cała szerokość */}
      <div className="w-full">
        <AwaDialogue 
          currentStep="ladder" 
          fullWidth={true}
          autoHide={true}
        />
      </div>
    </div>
  );
}

// --- PROMPT BUILDER ---
const buildFluxPromptFromLadder = (sessionData: any) => {
  const { ladderResults, usagePattern, emotionalPreference, visualDNA } = sessionData;
  
  if (!ladderResults?.coreNeed || !ladderResults?.promptElements) {
    return null;
  }

  const promptElements = ladderResults.promptElements;
  const timeOfDay = usagePattern?.timeOfDay || 'day';
  const emotion = emotionalPreference?.emotion || 'balanced';
  
  // Build comprehensive prompt for FLUX Kontext
  const basePrompt = `Professional interior design photography of a ${sessionData.roomType || 'living room'}`;
  const stylePrompt = visualDNA?.dominantStyle ? `, ${visualDNA.dominantStyle.toLowerCase()} style` : '';
  const atmospherePrompt = `, ${promptElements.atmosphere}`;
  const materialPrompt = `, featuring ${promptElements.materials}`;
  const colorPrompt = `, ${promptElements.colors}`;
  const lightingPrompt = `, ${promptElements.lighting}`;
  const layoutPrompt = `, ${promptElements.layout}`;
  const moodPrompt = `, ${promptElements.mood}`;
  const timePrompt = timeOfDay !== 'day' ? `, optimized for ${timeOfDay} use` : '';
  const emotionPrompt = emotion !== 'balanced' ? `, evoking ${emotion} feelings` : '';
  
  const qualityPrompt = `, high quality, realistic, architectural photography, natural lighting`;

  return `${basePrompt}${stylePrompt}${atmospherePrompt}${materialPrompt}${colorPrompt}${lightingPrompt}${layoutPrompt}${moodPrompt}${timePrompt}${emotionPrompt}${qualityPrompt}`;
};
