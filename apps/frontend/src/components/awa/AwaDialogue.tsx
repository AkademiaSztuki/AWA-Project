"use client";

import React, { useState, useEffect, useRef } from 'react';
import { FlowStep } from '@/types';
import TextType from "@/components/ui/TextType";
import GlassSurface from 'src/components/ui/GlassSurface';
import { useAudioManager } from '@/hooks/useAudioManager';
import { useDialogueVoice } from '@/hooks/useDialogueVoice';
import DialogueAudioPlayer from '../ui/DialogueAudioPlayer';

interface AwaDialogueProps {
  currentStep: FlowStep;
  message?: string;
  onDialogueEnd?: () => void;
  fullWidth?: boolean; // Nowy prop dla pełnej szerokości
  autoHide?: boolean; // Nowy prop dla automatycznego ukrywania
  customMessage?: string; // Nowy prop dla niestandardowego komunikatu IDA
}

const DIALOGUE_MAP: Record<FlowStep, string[]> = {
  landing: [
  "Cześć! Jestem IDA, Twoja futurystyczna asystentka projektowania wnętrz.",
    "Pomogę Ci odkryć Twoje preferencje designerskie i stworzyć wizualizacje marzeń.",
    "Gotowy na tę podróż?"
  ],
  onboarding: [
    "Zanim zaczniemy, muszę prosić o Twoją zgodę na udział w badaniu.",
    "Wszystkie dane będą anonimowe i wykorzystane wyłącznie do celów naukowych."
  ],
  upload: [
    "Świetnie! Teraz pokaż mi przestrzeń, którą chcesz przekształcić.",
    "Możesz wgrać zdjęcie swojego pokoju lub wybrać przykładowe.",
    "Moja sztuczna inteligencja automatycznie rozpozna typ pomieszczenia!",
    "To pomoże mi lepiej zrozumieć kontekst projektu."
  ],
  tinder: [
    "Teraz zagrajmy w grę! Pokażę Ci różne wnętrza.",
    "Przesuń w prawo, jeśli coś Cię intryguje, w lewo jeśli nie.",
    "Nie zastanawiaj się, podążaj za instynktem!"
  ],
  dna: [
    "Fascynujące! Analizuję Twoje wybory...",
    "Odkryłam ciekawe wzorce w Twoim guście estetycznym.",
    "To jest Twoje Wizualne DNA - czy czujesz, że to trafny opis?"
  ],
  ladder: [
    "Teraz porozmawiajmy o tym, co naprawdę jest dla Ciebie ważne.",
    "Pytania mogą się wydawać proste, ale pomogą mi zrozumieć Twoje głębokie potrzeby.",
    "Wybieraj to, co najlepiej opisuje Twoje odczucia."
  ],
  generation: [
    "Czas na magię! Wygenerowałam dla Ciebie wizualizacje.",
    "Oceń każdy obraz i powiedz mi, co chciałbyś zmienić.",
    "Razem udoskonalimy Twoją idealną przestrzeń!"
  ],
  survey_satisfaction: [
    "Jak oceniasz naszą współpracę?",
    "Twoja szczera opinia pomoże mi się rozwijać.",
    "Czy proces był dla Ciebie angażujący i przyjemny?"
  ],
  survey_clarity: [
    "Ostatnie pytania dotyczą Twoich preferencji.",
    "Czy nasza rozmowa pomogła Ci lepiej zrozumieć własny gust?",
    "To ważne dla moich badań nad rozwojem preferencji estetycznych."
  ],
  thanks: [
    "Dziękuję za tę wspaniałą podróż!",
    "Twoje odpowiedzi są niezwykle cenne.",
    "Mam nadzieję, że udało Ci się odkryć coś nowego i lepiej zrozumieć swoje preferencje!"
  ]
};

// Mapowanie kroków do plików audio
const AUDIO_MAP: Record<FlowStep, string> = {
  landing: "/audio/landing.mp3",
  onboarding: "/audio/onboarding.mp3",
  upload: "/audio/upload.mp3",
  tinder: "/audio/tinder.mp3",
  dna: "/audio/dna.mp3",
  ladder: "/audio/ladder.mp3",
  generation: "/audio/generation.mp3",
  survey_satisfaction: "/audio/survey_satisfaction.mp3",
  survey_clarity: "/audio/survey_clarity.mp3",
  thanks: "/audio/thanks.mp3"
};

export const AwaDialogue: React.FC<AwaDialogueProps> = ({
  currentStep,
  message,
  onDialogueEnd,
  fullWidth = false,
  autoHide = false,
  customMessage
}) => {
  // Zabezpieczenie przed undefined
  if (!currentStep) {
    console.error('AwaDialogue: currentStep is undefined');
    return null;
  }
  
  // Use custom message if provided, otherwise use default dialogues
  const dialogues = customMessage ? [customMessage] : (DIALOGUE_MAP[currentStep] || ["Cześć! Jestem IDA."]);
  const audioFile = AUDIO_MAP[currentStep] || "";
  
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [isVisible, setIsVisible] = useState(true); // Nowy stan dla widoczności
  
  // Zabezpieczenie przed pustą tablicą
  if (!dialogues || dialogues.length === 0) {
    console.error('AwaDialogue: No dialogues found for step:', currentStep);
    return null;
  }
  
  console.log('AwaDialogue render:', { currentStep, dialogues, audioFile, fullWidth, autoHide, audioReady, hasStarted, currentSentenceIndex });
  const audioManager = useAudioManager();
  const { volume: voiceVolume, isEnabled: voiceEnabled } = useDialogueVoice();

  console.log('AwaDialogue: useDialogueVoice hook returned:', { voiceVolume, voiceEnabled });

  const handleSentenceComplete = () => {
    console.log(`Completed sentence ${currentSentenceIndex + 1}/${dialogues.length}`);
    
    if (currentSentenceIndex < dialogues.length - 1) {
      // Przejdź do następnego zdania z dłuższą przerwą
      setTimeout(() => {
        setCurrentSentenceIndex(prev => prev + 1);
      }, 800); // Zmniejszone z 1500ms na 800ms
    } else {
      // Ostatnie zdanie zakończone
      console.log('All sentences completed');
      setIsDone(true);
      
      // Auto-hide po 2 sekundach jeśli włączone
      if (autoHide) {
        setTimeout(() => {
          setIsVisible(false);
        }, 2000);
      }
      
      // Wywołaj callback
      setTimeout(() => {
        if (onDialogueEnd) {
          onDialogueEnd();
        }
      }, 500);
    }
  };

  // Cała logika audioRef, new Audio, efekty synchronizujące, cleanup, itp. – USUNIĘTA

  useEffect(() => {
    // Resetuj stan gdy zmienia się krok
    setCurrentSentenceIndex(0);
    setIsDone(false);
    setHasStarted(false);
    setAudioReady(false);
    setIsVisible(true); // Resetuj widoczność
    
    // Zatrzymaj poprzedni dźwięk przy zmianie kroku
    // audioManager.unregisterDialogueAudio(audioRef.current); // audioRef.current nie istnieje
    // audioRef.current.pause();
    // audioRef.current = null;
  }, [currentStep, audioManager]);

  // Cleanup przy odmontowywaniu komponentu
  useEffect(() => {
    return () => {
      // audioRef.current.pause(); // audioRef.current nie istnieje
      // audioRef.current = null;
    };
  }, [audioManager]);

  // Handler kliknięcia aby odblokować audio i rozpocząć dialog (dla landing page)
  const handleClickToStart = () => {
    console.log('User clicked to start dialogue');
    setHasStarted(true);
    setAudioReady(true);
  };

  // Automatyczne uruchomienie dla wszystkich stron POZA landing
  // Landing wymaga kliknięcia aby użytkownik był skupiony
  useEffect(() => {
    if (currentStep !== 'landing' && currentSentenceIndex === 0 && !hasStarted) {
      console.log('Auto-starting dialogue for step:', currentStep);
      setHasStarted(true);
      setAudioReady(true); // Natychmiast rozpocznij dla stron które nie są landing
    }
  }, [currentStep, currentSentenceIndex, hasStarted]);

  // Jeśli audio nie jest gotowe
  if (!audioReady) {
    // Dla landing page pokaż "Kliknij aby rozpocząć"
    if (currentStep === 'landing') {
      return (
        <div 
          className="fixed inset-0 z-50 flex flex-col items-center justify-center text-center cursor-pointer"
          onClick={handleClickToStart}
        >
          <span className="inline-block whitespace-pre-wrap tracking-tight w-full text-3xl md:text-4xl font-nasalization font-bold text-white drop-shadow-lg select-none text-center hover:text-champagne transition-colors px-8">
            Kliknij gdziekolwiek, aby rozpocząć...
          </span>
        </div>
      );
    }
    // Dla innych stron pokaż loading (audio się ładuje automatycznie)
    return null;
  }

  // Jeśli autoHide jest włączone i dialog ma zniknąć
  if (autoHide && !isVisible) {
    return null;
  }

  console.log('AwaDialogue rendering with:', { currentSentenceIndex, dialogues, audioReady, hasStarted });
  
  // Debug render conditions
  console.log('AwaDialogue: Render conditions:', { 
    audioFile: !!audioFile, 
    voiceEnabled, 
    audioReady, 
    shouldRender: !!(audioFile && voiceEnabled && audioReady) 
  });
  
  // Różne style dla Landing vs inne strony
  const isLanding = currentStep === 'landing';
  
  return (
    <div className={`z-50 flex flex-col items-center justify-start w-full text-center ${
      fullWidth ? 'fixed bottom-0 left-0 right-0' : ''
    } ${
      isLanding 
        ? 'min-h-[220px] p-8' 
        : 'min-h-[180px] p-6 pb-8'
    }`}>
      <span className={`inline-block whitespace-pre-wrap tracking-tight w-full font-nasalization font-bold drop-shadow-lg select-none text-center ${
        isLanding 
          ? 'text-3xl md:text-4xl text-white' 
          : 'text-2xl md:text-3xl text-white/90'
      }`}>
        <TextType
          text={dialogues?.[currentSentenceIndex] ?? ""}
          typingSpeed={45}
          pauseDuration={500}
          onSentenceComplete={handleSentenceComplete}
          loop={false}
        />
      </span>
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