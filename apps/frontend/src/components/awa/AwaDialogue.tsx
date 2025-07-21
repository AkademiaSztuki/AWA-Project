import React, { useState, useEffect } from 'react';
import { FlowStep } from '@/types';

interface AwaDialogueProps {
  currentStep: FlowStep;
  message?: string;
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
  message
}) => {
  const [currentMessage, setCurrentMessage] = useState(0);
  const [isTyping, setIsTyping] = useState(false);

  const dialogues = DIALOGUE_MAP[currentStep] || ["Cześć! Jestem AWA."];

  useEffect(() => {
    setCurrentMessage(0);
    setIsTyping(true);

    const timer = setTimeout(() => {
      setIsTyping(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, [currentStep]);

  const nextMessage = () => {
    if (currentMessage < dialogues.length - 1) {
      setCurrentMessage(prev => prev + 1);
      setIsTyping(true);
      setTimeout(() => setIsTyping(false), 1000);
    }
  };

  return (
    <div className="glass-panel rounded-lg p-4 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-3 h-3 bg-gold-400 rounded-full animate-pulse"></div>
        <span className="text-gold-600 font-futuristic text-sm">AWA</span>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <p className={`text-gray-800 text-sm leading-relaxed font-modern ${
          isTyping ? 'animate-pulse' : ''
        }`}>
          {message || dialogues[currentMessage]}
        </p>

        {isTyping && (
          <div className="flex gap-1 mt-2">
            <div className="w-2 h-2 bg-gold-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-gold-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
            <div className="w-2 h-2 bg-gold-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          </div>
        )}
      </div>

      {currentMessage < dialogues.length - 1 && (
        <button
          onClick={nextMessage}
          className="glass-button px-3 py-1 rounded-md text-xs font-modern self-end mt-2"
        >
          Dalej →
        </button>
      )}
    </div>
  );
};