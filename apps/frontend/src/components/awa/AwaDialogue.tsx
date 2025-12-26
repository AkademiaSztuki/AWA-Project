"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FlowStep } from '@/types';
import TextType from "@/components/ui/TextType";
import GlassSurface from 'src/components/ui/GlassSurface';
import { useAudioManager } from '@/hooks/useAudioManager';
import { useDialogueVoice } from '@/hooks/useDialogueVoice';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAnimation } from '@/contexts/AnimationContext';
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
      "Cześć, jestem IDA.",
      "Stwórzmy razem wizualizacje wnętrz dopasowane do Ciebie. ",
      "Dziękuję za testy — to wczesna wersja aplikacji w ramach doktoratu Jakuba.",
      "Masz uwagi lub znalazłeś błąd? Daj znać. Każda uwaga jest bardzo cenna!"
    ],
    en: [
      "Hi, I’m IDA.",
      "Let’s create interior visualizations tailored to you together.",
      "Thanks for testing — this is an early version of the app as part of Jakub’s PhD.",
      "Have feedback or found a bug? Let me know. Every note is truly valuable!"
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
      "Przeczytaj informacje na ekranie i zaznacz checkbox 'Akceptuję wszystkie warunki i wyrażam zgodę', aby przejść dalej."
    ],
    en: [
      "Before we begin, I need to ask for your formal consent to participate in the study.",
      "Read the information on the screen and check the 'I accept all terms and give consent' checkbox to continue."
    ]
  },
  
  // --- Wizard Steps ---
  wizard_demographics: {
    pl: [
      "Uzupełnij wiek, płeć i wykształcenie - te dane pomogą mi lepiej dopasować wnętrze do Twoich potrzeb."
    ],
    en: [
      "Fill in your age, gender, and education - this data will help me better tailor the interior to your needs."
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

  // --- Additional Steps ---
  inspirations: {
    pl: [
      "Wgraj zdjęcia wnętrz, które Cię inspirują.",
      "Możesz dodać do 10 zdjęć - pomogą mi lepiej zrozumieć Twój gust."
    ],
    en: [
      "Upload photos of interiors that inspire you.",
      "You can add up to 10 photos - they will help me better understand your taste."
    ]
  },
  big_five: {
    pl: [
      "Teraz wypełnimy test osobowości Big Five - to naukowo zweryfikowany model  wymiarów osobowości.",
      "Test bada pięć obszarów: otwartość, sumienność, ekstrawersję, ugodowość i neurotyczność.",
      
    ],
    en: [
      "Now we'll complete the Big Five personality test - a scientifically validated model of  personality dimensions.",
      "The test examines five areas: openness, conscientiousness, extraversion, agreeableness, and neuroticism.",
      
    ]
  },
  dashboard: {
    pl: [
      "Oto Twój panel użytkownika - centrum wszystkich Twoich danych i projektów.",
      "Znajdziesz tu wszystkie odpowiedzi z ankiet, wygenerowane wizualizacje, inspiracje, profile przestrzeni i statystyki.",
      "Możesz przeglądać historię, zarządzać projektami i wracać do dowolnego etapu procesu."
    ],
    en: [
      "Here's your user panel - the center of all your data and projects.",
      "You'll find all your survey responses, generated visualizations, inspirations, space profiles, and statistics.",
      "You can browse history, manage projects, and return to any stage of the process."
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
      "Wgraj zdjęcie swojego wnętrza - najlepiej wyraźne, pokazujące większość przestrzeni."
    ],
    en: [
      "Upload a photo of your interior - preferably clear, showing most of the space."
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
      "Jak chcesz się czuć w nowym wnętrzu?",
      "Przesuń kropkę na wykresie w stronę pożądanego nastroju docelowego."
    ],
    en: [
      "How do you want to feel in the new interior?",
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
      "Gdy będą gotowe, wybierz jedną z nich, którą chcesz dalej udoskonalać."
    ],
    en: [
      "Generating visualizations. This may take a moment.",
      "When they are ready, choose one of them that you want to refine further."
    ]
  },
  survey_satisfaction: {
    pl: [
      "Oceń użyteczność systemu na skali 1-5.",
      "Twoja opinia o aplikacji jest dla mnie bardzo ważna."
    ],
    en: [
      "Rate the system usability on a scale of 1-5.",
      "Your opinion about the application is very important to me."
    ]
  },
  survey_clarity: {
    pl: [
      "Ostatnie pytania o krystalizację Twojego gustu estetycznego.",
      "Odpowiedz, czy i jak proces pomógł Ci lepiej zrozumieć własne preferencje."
    ],
    en: [
      "Final questions about the crystallization of your aesthetic taste.",
      "Answer how the process helped you better understand your own preferences."
    ]
  },
  thanks: {
    pl: [
      "Dziękuję za udział w badaniu!",
      "Twoje odpowiedzi zostały zapisane.",
      "W razie uwag lub pytań, proszę o kontakt"
    ],
    en: [
      "Thank you for participating in the study!",
      "Your answers have been saved.",
      "If you have any feedback or questions, please contact."
    ]
  }
};

// Audio file naming convention: /audio/{step}_{lang}.mp3
const getAudioFile = (step: string, lang: 'pl' | 'en'): string => {
  const audioSteps = [
    'landing', 'path_selection', 'onboarding',
    'wizard_demographics', 'wizard_lifestyle', 'tinder', 'wizard_semantic', 'wizard_sensory',
    'inspirations', 'big_five', 'dashboard',
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
  
  // Ustawienia prędkości i pauz - wszystko w jednym miejscu
  const TYPING_SPEED = 14.8; // Prędkość wyświetlania tekstu (ms między znakami)
  const PAUSE_BETWEEN_SENTENCES = 1500; // Pauza między zdaniami (ms) - używane w handleSentenceComplete
  const PAUSE_AFTER_ALL_SENTENCES = 3000; // Pauza po zakończeniu całego fragmentu (wszystkich zdań) (ms)
  const PAUSE_AFTER_TEXT = 0; // Pauza w TextType po zakończeniu tekstu (ms) - wyłączona, bo mamy PAUSE_BETWEEN_SENTENCES
  
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
  
  // Track transitioning state to prevent double-triggering
  const isTransitioningRef = useRef<boolean>(false);
  
  // Zabezpieczenie przed pustą tablicą
  if (!dialogues || dialogues.length === 0) {
    console.error('AwaDialogue: No dialogues found for step:', currentStep);
    return null;
  }
  
  // console.log('AwaDialogue render:', { currentStep, language, dialogues, audioFile, fullWidth, autoHide, audioReady, hasStarted, currentSentenceIndex });
  const audioManager = useAudioManager();
  const { volume: voiceVolume, isEnabled: voiceEnabled } = useDialogueVoice();
  const { playAnimation } = useAnimation();

  // console.log('AwaDialogue: useDialogueVoice hook returned:', { voiceVolume, voiceEnabled });

  const handleSentenceComplete = () => {
    // Prevent double-triggering
    if (isTransitioningRef.current) {
      console.log('[AwaDialogue] Already transitioning, ignoring completion');
      return;
    }

    console.log(`[AwaDialogue] Completed sentence ${currentSentenceIndex + 1}/${dialogues.length}`, {
      currentSentenceIndex,
      dialoguesLength: dialogues.length,
      currentText: dialogues[currentSentenceIndex],
      nextText: dialogues[currentSentenceIndex + 1]
    });
    
    // Mark as transitioning to prevent double calls
    isTransitioningRef.current = true;
    
    if (currentSentenceIndex < dialogues.length - 1) {
      setTimeout(() => {
        console.log(`[AwaDialogue] Moving to next sentence: ${currentSentenceIndex + 1} -> ${currentSentenceIndex + 2}`);
        // Reset transitioning flag for next sentence
        isTransitioningRef.current = false;
        setCurrentSentenceIndex(prev => prev + 1);
      }, PAUSE_BETWEEN_SENTENCES);
    } else {
      console.log('[AwaDialogue] All sentences completed');
      setIsDone(true);
      
      // Pauza po zakończeniu całego fragmentu przed ukryciem/wywołaniem callback
      setTimeout(() => {
        if (autoHide) {
          setTimeout(() => {
            console.log('AwaDialogue: Hiding dialogue after completion');
            setIsVisible(false);
          }, 4000); // Dodatkowa pauza przed ukryciem
        }
        
        if (onDialogueEnd) {
          onDialogueEnd();
        }
      }, PAUSE_AFTER_ALL_SENTENCES);
    }
  };

  // Reset transitioning flag when sentence changes
  useEffect(() => {
    isTransitioningRef.current = false;
  }, [currentSentenceIndex]);

  // Track previous step to only reset on actual step change
  const prevStepRef = useRef<string | FlowStep | undefined>(undefined);
  const prevLanguageRef = useRef<string | undefined>(undefined);
  const isResettingRef = useRef<boolean>(false);
  const hasInitializedRef = useRef<boolean>(false);

  useEffect(() => {
    // Only reset if step or language actually changed
    const stepChanged = prevStepRef.current !== currentStep;
    const languageChanged = prevLanguageRef.current !== language;
    
    // On first mount, always initialize
    const isFirstMount = !hasInitializedRef.current;
    
    if (stepChanged || languageChanged || isFirstMount) {
      console.log('AwaDialogue: Resetting for new step:', { currentStep, language, stepChanged, languageChanged, isFirstMount });
      
      // Mark as resetting to prevent fallback auto-start
      isResettingRef.current = true;
      
      // Reset all state immediately
      setCurrentSentenceIndex(0);
      setIsDone(false);
      setHasStarted(false);
      setAudioReady(false);
      setIsVisible(true);
      setShowClickPrompt(false);
      
      // Reset transitioning flag
      isTransitioningRef.current = false;
      
      // Update refs immediately
      prevStepRef.current = currentStep;
      prevLanguageRef.current = language;
      hasInitializedRef.current = true;
      
      // Auto-start for non-landing steps - use requestAnimationFrame to ensure state is set
      if (currentStep !== 'landing') {
        const stepToStart = currentStep;
        console.log('AwaDialogue: Auto-starting for step:', stepToStart);
        
        // Use requestAnimationFrame to ensure state updates are processed
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            // Double RAF to ensure state is fully updated
            if (prevStepRef.current === stepToStart) {
              console.log('AwaDialogue: Starting dialogue for step:', stepToStart);
              isResettingRef.current = false;
              setHasStarted(true);
              setAudioReady(true);
              // Play random talk animation when dialogue starts on other pages
              const talkAnimations: Array<'talk1' | 'talk2' | 'talk3'> = ['talk1', 'talk2', 'talk3'];
              const randomTalk = talkAnimations[Math.floor(Math.random() * talkAnimations.length)];
              playAnimation(randomTalk);
            }
          });
        });
      } else {
        // For landing, clear resetting flag immediately
        isResettingRef.current = false;
      }
    }
  }, [currentStep, language, playAnimation]);
  
  // Handle customMessage changes - reset dialogue when customMessage appears
  const prevCustomMessageRef = React.useRef<string | undefined>(undefined);
  useEffect(() => {
    // Only process if customMessage actually changed
    if (customMessage !== prevCustomMessageRef.current) {
      console.log('[AwaDialogue] customMessage changed:', {
        customMessage,
        prevCustomMessage: prevCustomMessageRef.current,
        hasStarted,
        isDone,
        currentSentenceIndex
      });
      
      // Only reset if customMessage is new (not just undefined -> undefined)
      if (customMessage && customMessage !== prevCustomMessageRef.current) {
        console.log('[AwaDialogue] New customMessage detected, resetting dialogue');
        // Reset dialogue state but don't interrupt if already started
        setCurrentSentenceIndex(0);
        setIsDone(false);
        setIsVisible(true);
        
        // Only reset audio if dialogue hasn't started yet
        if (!hasStarted) {
          setHasStarted(false);
          setAudioReady(false);
          // Auto-start after a short delay
          setTimeout(() => {
            setHasStarted(true);
            setAudioReady(true);
          }, 200);
        } else {
          // If already started, just reset sentence index to show new message
          // Dialogue will continue with updated dialogues from useMemo
        }
      }
      prevCustomMessageRef.current = customMessage;
    }
  }, [customMessage, hasStarted, currentSentenceIndex]);

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
    // Play loading animation when user clicks on landing page
    if (currentStep === 'landing') {
      playAnimation('loading_anim');
    }
  };

  const handleSkip = () => {
    console.log('User skipped dialogue');
    setIsDone(true);
    setIsVisible(false);
    if (onDialogueEnd) {
      onDialogueEnd();
    }
  };

  // Fallback auto-start: only if step hasn't changed but dialogue hasn't started
  // This handles edge cases where reset useEffect might not have triggered
  // But don't run if we're currently resetting
  useEffect(() => {
    if (currentStep !== 'landing' && !hasStarted && !audioReady && !isResettingRef.current) {
      // Wait a bit to see if main reset will trigger
      const timer = setTimeout(() => {
        // Double-check we're still not resetting and haven't started
        // Also check that step hasn't changed
        if (!isResettingRef.current && !hasStarted && !audioReady && prevStepRef.current === currentStep) {
          console.log('AwaDialogue: Fallback auto-start for step:', currentStep);
          setHasStarted(true);
          setAudioReady(true);
          // Play random talk animation
          const talkAnimations: Array<'talk1' | 'talk2' | 'talk3'> = ['talk1', 'talk2', 'talk3'];
          const randomTalk = talkAnimations[Math.floor(Math.random() * talkAnimations.length)];
          playAnimation(randomTalk);
        }
      }, 300); // Shorter delay - main reset should happen in 100ms
      return () => clearTimeout(timer);
    }
  }, [currentStep, hasStarted, audioReady, playAnimation]);

  const isLanding = currentStep === 'landing';
  
  // For landing, show click prompt if not ready
  if (!audioReady && currentStep === 'landing') {
    return (
      <div 
        className={`z-10 flex flex-col items-center justify-start w-full text-center pointer-events-auto ${
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

  if (autoHide && !isVisible) {
    return null;
  }
  
  // For non-landing steps, render dialogue even if audioReady is false
  // useEffect will set audioReady to true automatically, and dialogue will start
  // This ensures the component is always mounted and visible

  // console.log('AwaDialogue rendering with:', { currentSentenceIndex, dialogues, audioReady, hasStarted });
  
  // console.log('AwaDialogue: Render conditions:', { 
  //   audioFile: !!audioFile, 
  //   voiceEnabled, 
  //   audioReady, 
  //   shouldRender: !!(audioFile && voiceEnabled && audioReady) 
  // });
  
  return (
    <div className={`z-10 flex flex-col items-center justify-start w-full text-center pointer-events-none ${
      fullWidth ? 'fixed bottom-0 left-0 right-0' : 'relative'
    } ${
      isLanding 
        ? 'min-h-[380px] p-8' // Dialog should not block clicks - pointer-events-none ensures clicks pass through
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
      {hasStarted && audioReady ? (
        <TextType
          key={`${currentStep}-${currentSentenceIndex}`}
          as="div"
          initialDelay={isLanding ? 0 : 0}
          className={`whitespace-pre-wrap tracking-tight w-full font-nasalization font-bold drop-shadow-lg select-none text-center pointer-events-none ${
            isLanding 
              ? 'text-3xl md:text-4xl text-white' 
              : 'text-2xl md:text-3xl text-white/90'
          }`}
          text={dialogues?.[currentSentenceIndex] ?? ""}
          typingSpeed={TYPING_SPEED}
          pauseDuration={PAUSE_AFTER_TEXT}
          onSentenceComplete={handleSentenceComplete}
          loop={false}
        />
      ) : (
        // Show placeholder while waiting for auto-start
        <div className={`whitespace-pre-wrap tracking-tight w-full font-nasalization font-bold drop-shadow-lg select-none text-center pointer-events-none ${
          isLanding 
            ? 'text-3xl md:text-4xl text-white opacity-0' 
            : 'text-2xl md:text-3xl text-white/90 opacity-0'
        }`}>
          {/* Invisible placeholder to maintain layout */}
        </div>
      )}
      {audioFile && voiceEnabled && audioReady && (
        <DialogueAudioPlayer
          src={audioFile}
          volume={voiceVolume}
          autoPlay={true}
          onEnded={() => {
            // Audio completion doesn't trigger sentence transitions
            // Audio plays in background for entire dialogue
            console.log('[AwaDialogue] Audio completed for entire dialogue');
          }}
        />
      )}
    </div>
  );
};
