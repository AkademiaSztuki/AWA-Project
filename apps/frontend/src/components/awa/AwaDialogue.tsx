"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FlowStep } from '@/types';
import TextType from "@/components/ui/TextType";
import GlassSurface from 'src/components/ui/GlassSurface';
import { useAudioManager } from '@/hooks/useAudioManager';
import { useDialogueVoice } from '@/hooks/useDialogueVoice';
import { useLanguage } from '@/contexts/LanguageContext';
import DialogueAudioPlayer from '../ui/DialogueAudioPlayer';
import { ArrowRight } from 'lucide-react';

interface AwaDialogueProps {
  currentStep: FlowStep | string; // Allow string for new custom steps
  message?: string;
  onDialogueEnd?: () => void;
  fullWidth?: boolean;
  autoHide?: boolean;
  customMessage?: string;
}

// Dialogues with PL and EN versions
const DIALOGUE_MAP: Record<string, { pl: string[]; en: string[] }> = {
  landing: {
    pl: [
      "Cześć, jestem IDA - Interior Design Assistant.",
      "Przeprowadzę Cię przez cały proces tworzenia spersonalizowanych wizualizacji wnętrz.",
      "Dzięki, że testujesz tę aplikację! To pierwsza wersja testowa doktoratu Jakuba.",
      "Bardzo proszę o feedback - jeśli coś jest niejasne lub znajdziesz błąd, daj znać. Każda uwaga jest bardzo cenna!"
    ],
    en: [
      "Hi, I'm IDA - Interior Design Assistant.",
      "I'll guide you through the entire process of creating personalized interior visualizations.",
      "Thanks for testing this app! This is the first test version of Jakub's PhD dissertation.",
      "Please share your feedback - if anything is unclear or you find a bug, let me know. Every comment is very valuable!"
    ]
  },
  path_selection: {
    pl: [
      "Wybierz 'Pełne Doświadczenie', aby stworzyć dokładny profil swoich preferencji - to potrwa około 25 minut, ale da lepsze rezultaty.",
      "Wybierz 'Szybką Ścieżkę', jeśli chcesz od razu przejść do generowania. To zajmie tylko 3-5 minut.",
      "Kliknij jedną z kart, aby kontynuować."
    ],
    en: [
      "Choose 'Full Experience' to create a detailed profile of your preferences - it takes about 25 minutes but yields better results.",
      "Choose 'Fast Track' if you want to jump straight to generation. It will only take 3-5 minutes.",
      "Click one of the cards to continue."
    ]
  },
  onboarding: {
    pl: [
      "Zanim zaczniemy, muszę prosić Cię o formalną zgodę na udział w badaniu.",
      "Przeczytaj informacje na ekranie i kliknij przycisk 'Zgadzam się i Dalej', aby przejść do profilowania."
    ],
    en: [
      "Before we begin, I need to ask for your formal consent to participate in the study.",
      "Read the information on the screen and click 'I Agree and Continue' to proceed to profiling."
    ]
  },
  
  // --- Wizard Steps ---
  wizard_demographics: {
    pl: [
      "Zacznijmy od kilku pytań metryczkowych. Uzupełnij wiek, płeć i wykształcenie.",
      "Te dane są anonimowe i pomogą mi dobrać rozwiązania ergonomiczne odpowiednie dla Twojej grupy."
    ],
    en: [
      "Let's start with a few demographic questions. Fill in your age, gender, and education.",
      "This data is anonymous and helps me select ergonomic solutions suitable for your group."
    ]
  },
  wizard_lifestyle: {
    pl: [
      "Teraz opowiedz o swoim stylu życia. Zaznacz z kim mieszkasz i jaki tryb życia prowadzisz.",
      "Wybierz też najważniejsze cele, jakie ma spełniać Twoje wnętrze - np. relaks czy kreatywność."
    ],
    en: [
      "Now tell me about your lifestyle. Select who you live with and what your lifestyle is like.",
      "Also choose the most important goals your interior should meet - e.g., relaxation or creativity."
    ]
  },
  tinder: {
    pl: [
      "Pokażę Ci serię zdjęć wnętrz. Przesuwaj w prawo te, które Ci się podobają, w lewo te, które nie.",
      "Działaj intuicyjnie - to pozwoli mi zrozumieć Twój gust."
    ],
    en: [
      "I'll show you a series of interior photos. Swipe right for those you like, left for those you don't.",
      "Act intuitively - this will help me understand your taste."
    ]
  },
  wizard_semantic: {
    pl: [
      "Doprecyzujmy szczegóły. Zobaczysz pary zdjęć.",
      "Wybierz to, które bardziej Ci odpowiada pod kątem ciepła, jasności i złożoności wnętrza."
    ],
    en: [
      "Let's refine the details. You'll see pairs of photos.",
      "Choose the one that suits you better in terms of warmth, brightness, and complexity."
    ]
  },
  wizard_sensory: {
    pl: [
      "Czas na preferencje sensoryczne.",
      "Przejrzyj wszystkie kategorie na panelu po prawej i wybierz to, co do Ciebie pasuje."
    ],
    en: [
      "Time for sensory preferences.",
      "Browse all categories on the panel to the right and select what suits you."
    ]
  },

  // --- Fast Track ---
  style_selection: {
    pl: [
      "Wybierz jeden styl bazowy, który najbardziej Ci się podoba.",
      "To będzie nasz punkt wyjścia do dalszej pracy nad Twoim wnętrzem."
    ],
    en: [
      "Choose one base style that you like the most.",
      "This will be our starting point for further work on your interior."
    ]
  },

  // --- Room Setup ---
  upload: {
    pl: [
      "Teraz zajmiemy się konkretnym pokojem.",
      "Wgraj zdjęcie pomieszczenia - najlepiej wyraźne, pokazujące większość pokoju."
    ],
    en: [
      "Now let's focus on a specific room.",
      "Upload a photo of the space - preferably clear, showing most of the room."
    ]
  },
  room_analysis: {
    pl: [
      "Przeanalizowałam Twoje zdjęcie. Rozpoznałam typ pomieszczenia.",
      "Sprawdź czy wszystko się zgadza i w razie potrzeby skoryguj typ pokoju poniżej."
    ],
    en: [
      "I've analyzed your photo. I recognized the room type.",
      "Check if everything is correct and adjust the room type below if needed."
    ]
  },
  room_preference_source: {
    pl: [
      "Możemy użyć Twojego ogólnego profilu, albo wypełnić krótką ankietę specyficzną dla tego pokoju.",
      "Wybierz opcję, która bardziej Ci odpowiada."
    ],
    en: [
      "We can use your general profile, or fill out a short survey specific to this room.",
      "Choose the option that suits you better."
    ]
  },
  room_prs_current: {
    pl: [
      "Określ obecny nastrój tego pokoju na wykresie.",
      "Przesuń kropkę w miejsce, które najlepiej oddaje, jak się teraz czujesz w tym wnętrzu."
    ],
    en: [
      "Define the current mood of this room on the chart.",
      "Move the dot to the spot that best reflects how you feel in this interior right now."
    ]
  },
  room_usage: {
    pl: [
      "Kto będzie korzystał z tego pokoju?",
      "Zaznacz odpowiednią opcję, abym mogła uwzględnić potrzeby wszystkich domowników."
    ],
    en: [
      "Who will be using this room?",
      "Select the appropriate option so I can consider the needs of all household members."
    ]
  },
  room_activities: {
    pl: [
      "Zaznacz wszystkie czynności, które planujesz tu wykonywać.",
      "Kliknij na aktywność, aby określić jak często to robisz i czy obecny układ temu sprzyja."
    ],
    en: [
      "Select all activities you plan to do here.",
      "Click on an activity to specify how often you do it and if the current layout supports it."
    ]
  },
  room_pain_points: {
    pl: [
      "Co Ci przeszkadza w obecnym wnętrzu?",
      "Zaznacz wszystkie elementy, które chcesz zmienić lub poprawić"
    ],
    en: [
      "What bothers you about the current interior?",
      "Select all elements you want to change or improve, e.g."
    ]
  },
  room_prs_target: {
    pl: [
      "Teraz najważniejsze: jak chcesz się czuć w nowym wnętrzu?",
      "Przesuń kropkę na wykresie w stronę pożądanego nastroju docelowego."
    ],
    en: [
      "Now the most important part: how do you want to feel in the new interior?",
      "Move the dot on the chart towards the desired target mood."
    ]
  },
  room_summary: {
    pl: [
      "Mamy komplet informacji o tym pokoju.",
      "Kliknij 'Zacznij Projektowanie', aby wygenerować wizualizacje dopasowane do Twoich potrzeb."
    ],
    en: [
      "We have complete information about this room.",
      "Click 'Start Designing' to generate visualizations tailored to your needs."
    ]
  },

  // --- Generation & Results ---
  generation: {
    pl: [
      "Generuję wizualizacje. To może chwilę potrwać.",
      "Gdy będą gotowe, oceń każdą z nich, abyśmy mogły je dalej udoskonalać."
    ],
    en: [
      "Generating visualizations. This may take a moment.",
      "When they are ready, rate each one so we can refine them further."
    ]
  },
  survey_satisfaction: {
    pl: [
      "To już koniec. Wypełnij krótką ankietę satysfakcji.",
      "Twoja opinia jest dla mnie bardzo ważna."
    ],
    en: [
      "This is the end. Please fill out a short satisfaction survey.",
      "Your opinion is very important to me."
    ]
  },
  survey_clarity: {
    pl: [
      "Odpowiedz na ostatnie pytania dotyczące jasności procesu.",
      "Dzięki temu będę mogła lepiej pomagać w przyszłości."
    ],
    en: [
      "Answer the last questions regarding the clarity of the process.",
      "This will help me assist better in the future."
    ]
  },
  thanks: {
    pl: [
      "Dziękuję za udział w badaniu!",
      "Twoje odpowiedzi zostały zapisane."
    ],
    en: [
      "Thank you for participating in the study!",
      "Your answers have been saved."
    ]
  }
};

// Audio file naming convention: /audio/{step}_{lang}.mp3
const getAudioFile = (step: string, lang: 'pl' | 'en'): string => {
  const audioSteps = [
    'landing', 'path_selection', 'onboarding',
    'wizard_demographics', 'wizard_lifestyle', 'tinder', 'wizard_semantic', 'wizard_sensory',
    'style_selection',
    'upload', 'room_analysis', 'room_preference_source', 'room_prs_current',
    'room_usage', 'room_activities', 'room_pain_points', 'room_prs_target', 'room_summary',
    'generation', 'survey_satisfaction', 'survey_clarity', 'thanks'
  ];
  
  if (audioSteps.includes(step)) {
    return `/audio/${step}_${lang}.mp3`;
  }
  return '';
};

export const AwaDialogue: React.FC<AwaDialogueProps> = ({
  currentStep,
  message,
  onDialogueEnd,
  fullWidth = false,
  autoHide = false,
  customMessage
}) => {
  const { language } = useLanguage();
  
  // Zabezpieczenie przed undefined
  if (!currentStep) {
    console.error('AwaDialogue: currentStep is undefined');
    return null;
  }
  
  // Get dialogues for current language - use useMemo to ensure it's always up to date
  const dialogues = useMemo(() => {
    const stepDialogues = DIALOGUE_MAP[currentStep];
    
    if (customMessage) {
      // If customMessage is provided and we have step dialogues, append customMessage after them
      // Otherwise, use only customMessage
      const baseDialogues = stepDialogues?.[language] || stepDialogues?.pl || [];
      if (baseDialogues.length > 0) {
        const result = [...baseDialogues, customMessage];
        console.log('[AwaDialogue] Appending customMessage to base dialogues:', {
          currentStep,
          baseDialoguesCount: baseDialogues.length,
          customMessage,
          totalDialogues: result.length,
          dialogues: result
        });
        return result;
      } else {
        console.log('[AwaDialogue] Using only customMessage:', customMessage);
        return [customMessage];
      }
    } else {
      return stepDialogues?.[language] || stepDialogues?.pl || ["Cześć! Jestem IDA."];
    }
  }, [currentStep, language, customMessage]);
  
  const audioFile = getAudioFile(currentStep, language);
  
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [showClickPrompt, setShowClickPrompt] = useState(false);
  
  // Zabezpieczenie przed pustą tablicą
  if (!dialogues || dialogues.length === 0) {
    console.error('AwaDialogue: No dialogues found for step:', currentStep);
    return null;
  }
  
  // console.log('AwaDialogue render:', { currentStep, language, dialogues, audioFile, fullWidth, autoHide, audioReady, hasStarted, currentSentenceIndex });
  const audioManager = useAudioManager();
  const { volume: voiceVolume, isEnabled: voiceEnabled } = useDialogueVoice();

  // console.log('AwaDialogue: useDialogueVoice hook returned:', { voiceVolume, voiceEnabled });

  const handleSentenceComplete = () => {
    console.log(`[AwaDialogue] Completed sentence ${currentSentenceIndex + 1}/${dialogues.length}`, {
      currentSentenceIndex,
      dialoguesLength: dialogues.length,
      currentText: dialogues[currentSentenceIndex],
      nextText: dialogues[currentSentenceIndex + 1]
    });
    
    if (currentSentenceIndex < dialogues.length - 1) {
      setTimeout(() => {
        console.log(`[AwaDialogue] Moving to next sentence: ${currentSentenceIndex + 1} -> ${currentSentenceIndex + 2}`);
        setCurrentSentenceIndex(prev => prev + 1);
      }, 800);
    } else {
      console.log('[AwaDialogue] All sentences completed');
      setIsDone(true);
      
      if (autoHide) {
        setTimeout(() => {
          console.log('AwaDialogue: Hiding dialogue after completion');
          setIsVisible(false);
        }, 5000); // Increased from 2000 to 5000ms to give more time to read
      }
      
      setTimeout(() => {
        if (onDialogueEnd) {
          onDialogueEnd();
        }
      }, 500);
    }
  };

  useEffect(() => {
    // console.log('AwaDialogue: Resetting for new step:', currentStep);
    setCurrentSentenceIndex(0);
    setIsDone(false);
    setHasStarted(false);
    setAudioReady(false);
    setIsVisible(true);
    setShowClickPrompt(false);
  }, [currentStep, language, audioManager]);
  
  // Handle customMessage changes - reset dialogue when customMessage appears
  const prevCustomMessageRef = React.useRef<string | undefined>(undefined);
  useEffect(() => {
    console.log('[AwaDialogue] customMessage effect triggered:', {
      customMessage,
      prevCustomMessage: prevCustomMessageRef.current,
      hasStarted,
      isDone,
      currentSentenceIndex,
      dialoguesLength: dialogues.length
    });
    
    // Reset if customMessage changed from undefined/null to a value, OR if it changed to a different value
    if (customMessage && customMessage !== prevCustomMessageRef.current) {
      console.log('[AwaDialogue] customMessage changed, resetting dialogue:', {
        customMessage,
        prevCustomMessage: prevCustomMessageRef.current,
        hasStarted,
        isDone,
        currentSentenceIndex,
        dialoguesLength: dialogues.length,
        allDialogues: dialogues
      });
      // Force reset dialogue to show new customMessage (will be appended to base dialogues)
      setCurrentSentenceIndex(0);
      setIsDone(false);
      setIsVisible(true);
      // Reset audio state
      setHasStarted(false);
      setAudioReady(false);
      // Auto-start the dialogue after reset
      setTimeout(() => {
        console.log('[AwaDialogue] Auto-starting dialogue after customMessage reset, dialogues:', dialogues);
        setHasStarted(true);
        setAudioReady(true);
      }, 300);
    }
    prevCustomMessageRef.current = customMessage;
  }, [customMessage, dialogues]);

  useEffect(() => {
    if (currentStep === 'landing' && !audioReady) {
      const timer = setTimeout(() => {
        setShowClickPrompt(true);
      }, 900);
      return () => clearTimeout(timer);
    }
  }, [currentStep, audioReady]);

  useEffect(() => {
    return () => {};
  }, [audioManager]);

  const handleClickToStart = () => {
    console.log('User clicked to start dialogue');
    setHasStarted(true);
    setAudioReady(true);
  };

  const handleSkip = () => {
    console.log('User skipped dialogue');
    setIsDone(true);
    setIsVisible(false);
    if (onDialogueEnd) {
      onDialogueEnd();
    }
  };

  useEffect(() => {
    // Auto-start for non-landing steps
    if (currentStep !== 'landing' && !hasStarted && !audioReady) {
      console.log('Auto-starting dialogue for step:', currentStep);
      // Small delay to ensure state is reset
      const timer = setTimeout(() => {
        setHasStarted(true);
        setAudioReady(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentStep, hasStarted, audioReady]);

  const isLanding = currentStep === 'landing';
  
  if (!audioReady) {
    if (currentStep === 'landing') {
      return (
        <div 
          className={`z-50 flex flex-col items-center justify-start w-full text-center ${
            fullWidth ? 'fixed bottom-0 left-0 right-0' : ''
          } ${
            isLanding 
              ? 'min-h-[380px] p-8' 
              : 'min-h-[260px] p-6 pb-8'
          } cursor-pointer`}
          onClick={handleClickToStart}
        >
          <span className={`whitespace-pre-wrap tracking-tight w-full font-nasalization font-bold drop-shadow-lg select-none text-center hover:text-champagne transition-opacity duration-300 ${
            showClickPrompt ? 'opacity-100' : 'opacity-0'
          } ${
            isLanding 
              ? 'text-3xl md:text-4xl text-white' 
              : 'text-2xl md:text-3xl text-white/90'
          }`}>
            {language === 'pl' ? 'Kliknij gdziekolwiek, aby rozpocząć...' : 'Click anywhere to start...'}
          </span>
        </div>
      );
    }
    return null;
  }

  if (autoHide && !isVisible) {
    return null;
  }

  // console.log('AwaDialogue rendering with:', { currentSentenceIndex, dialogues, audioReady, hasStarted });
  
  // console.log('AwaDialogue: Render conditions:', { 
  //   audioFile: !!audioFile, 
  //   voiceEnabled, 
  //   audioReady, 
  //   shouldRender: !!(audioFile && voiceEnabled && audioReady) 
  // });
  
  return (
    <div className={`z-50 flex flex-col items-center justify-start w-full text-center pointer-events-none relative ${
      fullWidth ? 'fixed bottom-0 left-0 right-0' : ''
    } ${
      isLanding 
        ? 'min-h-[380px] p-8 pointer-events-auto' // Landing needs interaction for audio start if needed, though main start is handled in separate block
        : 'min-h-[260px] p-6 pb-8'
    }`}>
      {isLanding && audioReady && hasStarted && (
        <button
          onClick={handleSkip}
          className="absolute top-40 right-8 flex flex-col items-end gap-1 pointer-events-auto group transition-opacity duration-300 hover:opacity-80"
          aria-label={language === 'pl' ? 'Pomiń dialog' : 'Skip dialogue'}
        >
          <span className="text-white/40 text-sm font-nasalization font-medium tracking-wide">
            {language === 'pl' ? 'Pomiń' : 'Skip'}
          </span>
          <div className="flex items-center gap-1 text-white/30 group-hover:text-white/50 transition-colors duration-300">
            <ArrowRight size={16} className="translate-x-0 group-hover:translate-x-1 transition-transform duration-300" />
          </div>
        </button>
      )}
      <TextType
        key={`${currentStep}-${currentSentenceIndex}`}
        as="div"
        initialDelay={isLanding ? 300 : 0}
        className={`whitespace-pre-wrap tracking-tight w-full font-nasalization font-bold drop-shadow-lg select-none text-center ${
          isLanding 
            ? 'text-3xl md:text-4xl text-white' 
            : 'text-2xl md:text-3xl text-white/90'
        }`}
        text={dialogues?.[currentSentenceIndex] ?? ""}
        typingSpeed={45}
        pauseDuration={500}
        onSentenceComplete={handleSentenceComplete}
        loop={false}
      />
      {audioFile && voiceEnabled && audioReady && (
        <DialogueAudioPlayer
          src={audioFile}
          volume={voiceVolume}
          autoPlay={true}
          onEnded={handleSentenceComplete}
        />
      )}
    </div>
  );
};
