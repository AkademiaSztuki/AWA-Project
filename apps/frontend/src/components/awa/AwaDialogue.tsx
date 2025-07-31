"use client";

import React, { useState, useEffect, useRef } from 'react';
import { FlowStep } from '@/types';
import TextType from "@/components/ui/TextType";
import GlassSurface from 'src/components/ui/GlassSurface';

interface AwaDialogueProps {
  currentStep: FlowStep;
  message?: string;
  onDialogueEnd?: () => void;
  fullWidth?: boolean; // Nowy prop dla pełnej szerokości
  autoHide?: boolean; // Nowy prop dla automatycznego ukrywania
}

const DIALOGUE_MAP: Record<FlowStep, string[]> = {
  landing: [
    "Cześć! Jestem AWA, Twoja futurystyczna asystentka projektowania wnętrz.",
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
    "Jak oceniasz nasze współpracę?",
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
    "Twoje odpowiedzi są niezwykle cenne dla badań nad AI w designie.",
    "Mam nadzieję, że odkryłeś coś nowego o swoich preferencjach!"
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
  autoHide = false
}) => {
  const dialogues = DIALOGUE_MAP[currentStep] || ["Cześć! Jestem AWA."];
  const audioFile = AUDIO_MAP[currentStep] || "";
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [isVisible, setIsVisible] = useState(true); // Nowy stan dla widoczności
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Resetuj stan gdy zmienia się krok
    setCurrentSentenceIndex(0);
    setIsDone(false);
    setHasStarted(false);
    setAudioReady(false);
    setIsVisible(true); // Resetuj widoczność
  }, [currentStep]);

  const playAudio = (audioPath: string) => {
    console.log('Attempting to play audio:', audioPath);
    
    if (!audioPath) {
      console.log('No audio path provided');
      setAudioReady(true); // Jeśli nie ma audio, od razu gotowe
      return;
    }
    
    // Zatrzymaj tylko audio dialogów, nie muzykę ambientową
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    
    const audio = new Audio(audioPath);
    audioRef.current = audio;
    
    // Dodaj identyfikator żeby odróżnić od muzyki ambientowej
    audio.dataset.type = 'dialogue';
    
    // Ustaw niższą głośność dla dialogów żeby nie zagłuszały muzyki ambientowej
    audio.volume = 0.7; // 70% głośności dla dialogów
    
    // Dodaj obsługę błędów i informacje o autoplay policy
    audio.play().then(() => {
      console.log('Dialogue audio started playing successfully');
      setAudioReady(true); // Audio się odtwarza, dialog może się rozpocząć
    }).catch(error => {
      console.log('Dialogue audio playback failed:', error);
      if (error.name === 'NotAllowedError') {
        console.log('Autoplay blocked by browser. User interaction required.');
        // Spróbuj ponownie po interakcji użytkownika
        const handleUserInteraction = () => {
          audio.play().then(() => {
            console.log('Dialogue audio started playing after user interaction');
            setAudioReady(true); // Audio się odtwarza, dialog może się rozpocząć
          }).catch(err => {
            console.log('Dialogue audio still failed after user interaction:', err);
            setAudioReady(true); // Nawet jeśli audio nie działa, dialog może się rozpocząć
          });
          document.removeEventListener('click', handleUserInteraction);
          document.removeEventListener('keydown', handleUserInteraction);
        };
        document.addEventListener('click', handleUserInteraction);
        document.addEventListener('keydown', handleUserInteraction);
      } else if (error.name === 'NotSupportedError') {
        console.log('Dialogue audio format not supported or file not found:', audioPath);
        setAudioReady(true); // Jeśli audio nie działa, dialog może się rozpocząć
      } else {
        console.log('Unknown dialogue audio error:', error);
        setAudioReady(true); // Jeśli audio nie działa, dialog może się rozpocząć
      }
    });
  };

  const handleSentenceComplete = () => {
    console.log(`Completed sentence ${currentSentenceIndex + 1}/${dialogues.length}`);
    
    if (currentSentenceIndex < dialogues.length - 1) {
      // Przejdź do następnego zdania
      setTimeout(() => {
        setCurrentSentenceIndex(prev => prev + 1);
      }, 500);
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

  // Sprawdź audio i rozpocznij dialog gdy audio jest gotowe
  useEffect(() => {
    if (currentSentenceIndex === 0 && !hasStarted && audioFile) {
      setHasStarted(true);
      console.log('Checking audio and preparing to start dialogue:', audioFile);
      
      // Sprawdź czy plik istnieje przed próbą odtwarzania
      fetch(audioFile, { method: 'HEAD' })
        .then(response => {
          if (response.ok) {
            // Spróbuj odtworzyć audio
            playAudio(audioFile);
          } else {
            console.log('Audio file not found:', audioFile);
            setAudioReady(true); // Jeśli plik nie istnieje, dialog może się rozpocząć
          }
        })
        .catch(error => {
          console.log('Error checking audio file:', audioFile, error);
          setAudioReady(true); // Jeśli błąd, dialog może się rozpocząć
        });
    } else if (currentSentenceIndex === 0 && !hasStarted && !audioFile) {
      // Jeśli nie ma audio, od razu gotowe
      setHasStarted(true);
      setAudioReady(true);
    }
  }, [currentSentenceIndex, hasStarted, audioFile]);

  // Jeśli nie ma audio lub audio jest gotowe, pokaż dialog
  if (!audioReady) {
    return (
      <div className={`z-30 flex flex-col items-center justify-start min-h-[220px] w-full p-8 text-center mt-12 ${fullWidth ? 'fixed bottom-0 left-0 right-0' : ''}`}>
        <span className="inline-block whitespace-pre-wrap tracking-tight w-full text-3xl md:text-4xl font-nasalization font-bold text-white drop-shadow-lg select-none text-center mt-8">
          Kliknij gdziekolwiek, aby rozpocząć...
        </span>
      </div>
    );
  }

  // Jeśli autoHide jest włączone i dialog ma zniknąć
  if (autoHide && !isVisible) {
    return null;
  }

  return (
    <div className={`z-30 flex flex-col items-center justify-start min-h-[220px] w-full p-8 text-center mt-12 ${fullWidth ? 'fixed bottom-0 left-0 right-0' : ''}`}>
      <span className="inline-block whitespace-pre-wrap tracking-tight w-full text-3xl md:text-4xl font-nasalization font-bold text-white drop-shadow-lg select-none text-center mt-8">
        <TextType
          text={dialogues[currentSentenceIndex]}
          typingSpeed={45}
          pauseDuration={0}
          onSentenceComplete={handleSentenceComplete}
          loop={false}
        />
      </span>
    </div>
  );
};