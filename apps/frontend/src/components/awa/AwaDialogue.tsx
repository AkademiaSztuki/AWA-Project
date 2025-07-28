"use client";

import React, { useState, useEffect } from 'react';
import { FlowStep } from '@/types';
import TextType from "@/components/ui/TextType";
import GlassSurface from 'src/components/ui/GlassSurface';

interface AwaDialogueProps {
  currentStep: FlowStep;
  message?: string;
  onDialogueEnd?: () => void;
}

const DIALOGUE_MAP: Record<FlowStep, string[]> = {
  landing: [
    "Cześć! Jestem AWA, Twoja futurystyczna asystentka projektowania wnętrz.",
    "Pomogę Ci odkryć Twoje preferencje designerskie i stworzyć wizualizacje marzeń.",
    "Gotowy na tę podróż?"
  ],
  onboarding: [
    "Zanim zaczniemy, muszę prosić o Twoją zgodę na udział w badaniu.",
    "Wszystkie dane będą anonimowe i wykorzystane wyłącznie do celów naukowych.",
    "Akademia Sztuk Pięknych prowadzi badania nad współpracą człowieka z AI."
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

export const AwaDialogue: React.FC<AwaDialogueProps> = ({
  currentStep,
  message,
  onDialogueEnd
}) => {
  const dialogues = DIALOGUE_MAP[currentStep] || ["Cześć! Jestem AWA."];
  const [currentMessage, setCurrentMessage] = useState(0);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    setIsDone(false);
  }, [currentMessage]);

  const nextMessage = () => {
    if (currentMessage < dialogues.length - 1) {
      setCurrentMessage(prev => prev + 1);
      setIsDone(false);
    } else if (onDialogueEnd) {
      onDialogueEnd();
    }
  };

  return (
    <div className="z-30 flex flex-col items-center justify-start min-h-[220px] w-full p-8 text-center mt-12">
      <span className="inline-block whitespace-pre-wrap tracking-tight w-full text-3xl md:text-4xl font-nasalization font-bold text-white drop-shadow-lg select-none text-center mt-8">
        <TextType
          text={message || dialogues[currentMessage]}
          typingSpeed={75}
          pauseDuration={1500}
          showCursor={true}
          cursorCharacter="|"
          onSentenceComplete={() => setIsDone(true)}
        />
      </span>
      {isDone && (
        <div className="mt-12 flex justify-center w-full">
          <GlassSurface
            width={260}
            height={64}
            borderRadius={32}
            className="cursor-pointer select-none transition-transform duration-200 hover:scale-105 shadow-xl focus:outline-none focus:ring-2 focus:ring-gold-400"
            onClick={nextMessage}
            aria-label={currentMessage < dialogues.length - 1 ? 'Dalej' : 'Zaczynamy'}
          >
            <span className="text-2xl font-nasalization font-bold text-white">
              {currentMessage < dialogues.length - 1 ? 'Dalej →' : 'Zaczynamy!'}
            </span>
          </GlassSurface>
        </div>
      )}
    </div>
  );
};