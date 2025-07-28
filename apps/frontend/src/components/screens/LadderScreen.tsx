"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { AwaContainer } from '../awa/AwaContainer';
import { useSessionData } from '@/hooks/useSessionData';

const LADDER_QUESTIONS = [
  {
    level: 1,
    question: "Skupmy się na Twoim dominującym stylu. Dlaczego ten styl jest dla Ciebie ważny?",
    options: [
      "Jest przyjemny dla oka",
      "Tworzy poczucie spokoju",  
      "Jest oryginalny i nietypowy",
      "Pasuje do mojego stylu życia"
    ]
  },
  {
    level: 2,
    question: "A dlaczego [wybrana opcja] jest kluczowa w tej przestrzeni?",
    options: [
      "By odpocząć po pracy",
      "By lepiej się skupić",
      "By stworzyć bezpieczną przystań dla rodziny",
      "By wyrażać swoją osobowość"
    ]
  },
  {
    level: 3,
    question: "Co to znaczy dla Ciebie jako osoby?",
    options: [
      "Poczucie harmonii wewnętrznej",
      "Możliwość bycia sobą",
      "Równowaga między pracą a życiem",
      "Tworzenie wspomnień z bliskimi"
    ]
  }
];

export function LadderScreen() {
  const router = useRouter();
  const { updateSessionData } = useSessionData();
  const [currentLevel, setCurrentLevel] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);

  const handleAnswer = (answer: string) => {
    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);

    if (currentLevel < LADDER_QUESTIONS.length - 1) {
      setCurrentLevel(currentLevel + 1);
    } else {
      // Zakończ drabinę potrzeb
      updateSessionData({
        ladderPath: newAnswers,
        coreNeed: answer
      });
      router.push('/flow/generate');
    }
  };

  const currentQuestion = LADDER_QUESTIONS[currentLevel];
  const progress = ((currentLevel + 1) / LADDER_QUESTIONS.length) * 100;

  return (
    <div className="min-h-screen flex">
      {/* Development Skip Button */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-4 right-4 z-50">
          <GlassButton
            onClick={() => router.push('/flow/generate')}
            variant="secondary"
            size="sm"
            className="bg-red-500/20 border-red-400/40 text-red-700 hover:bg-red-400/30"
          >
            🚀 Pomiń (DEV)
          </GlassButton>
        </div>
      )}

      <AwaContainer currentStep="ladder" showDialogue={false} />

      <div className="flex-1 ml-[400px] flex items-center justify-center p-8">
        <div className="w-full max-w-3xl mx-auto">
          <GlassCard className="w-full">
            <div className="mb-6">
              <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
                <span>Poziom {currentLevel + 1}</span>
                <span>{Math.round(progress)}% ukończone</span>
              </div>
              <div className="bg-white/20 rounded-full h-2">
                <div 
                  className="bg-gold rounded-full h-2 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
              Dialog o Sensie
            </h2>

            <div className="mb-8">
              <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                {currentQuestion.question.replace('[wybrana opcja]', answers[answers.length - 1] || 'to')}
              </p>

              <div className="space-y-3">
                {currentQuestion.options.map((option, index) => (
                  <GlassButton
                    key={index}
                    onClick={() => handleAnswer(option)}
                    variant="primary"
                    size="lg"
                    className="w-full text-left justify-start p-4 hover:bg-gold/10"
                  >
                    {option}
                  </GlassButton>
                ))}
              </div>
            </div>

            {answers.length > 0 && (
              <div className="text-sm text-gray-500 text-center">
                <p>Twoja ścieżka: {answers.join(' → ')}</p>
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}