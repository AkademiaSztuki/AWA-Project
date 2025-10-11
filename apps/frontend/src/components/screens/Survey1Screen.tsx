"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { AwaContainer } from '../awa/AwaContainer';
import { useSessionData } from '@/hooks/useSessionData';

const SATISFACTION_QUESTIONS = [
  {
    key: 'agency_control',
    question: 'Czułem/am, że to ja kontrolowałem/am wynik końcowy.',
    category: 'Agency'
  },
  {
    key: 'agency_decisions',
    question: 'Wizualizacje odzwierciedlały moje decyzje.',
    category: 'Agency'
  },
  {
    key: 'agency_influence',
    question: 'Miałem/am realny wpływ na proces projektowania.',
    category: 'Agency'
  },
  {
    key: 'satisfaction_ease',
    question: 'Korzystanie z narzędzia było łatwe i intuicyjne.',
    category: 'Satisfaction'
  },
  {
    key: 'satisfaction_enjoyable',
    question: 'Proces był przyjemny i angażujący.',
    category: 'Satisfaction'
  },
  {
    key: 'satisfaction_useful',
    question: 'Narzędzie było przydatne do odkrywania moich preferencji.',
    category: 'Satisfaction'
  },
  {
    key: 'satisfaction_recommend',
    question: 'Poleciłbym/ałbym to narzędzie innym osobom.',
    category: 'Satisfaction'
  }
];

export function Survey1Screen() {
  const router = useRouter();
  const { updateSessionData } = useSessionData();
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const handleAnswerChange = (key: string, value: number) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  };

  const handleContinue = () => {
    // Oblicz średnie dla kategorii
    const agencyQuestions = SATISFACTION_QUESTIONS.filter(q => q.category === 'Agency');
    const satisfactionQuestions = SATISFACTION_QUESTIONS.filter(q => q.category === 'Satisfaction');

    const agencyScore = agencyQuestions.reduce((sum, q) => sum + (answers[q.key] || 4), 0) / agencyQuestions.length;
    const satisfactionScore = satisfactionQuestions.reduce((sum, q) => sum + (answers[q.key] || 4), 0) / satisfactionQuestions.length;

    updateSessionData({
      surveyData: {
        ...answers,
        agencyScore,
        satisfactionScore,
        survey1Completed: Date.now()
      }
    });

    router.push('/flow/survey2');
  };

  const allAnswered = SATISFACTION_QUESTIONS.every(q => answers[q.key] !== undefined);

  return (
    <div className="min-h-screen flex">
      

      <AwaContainer currentStep="survey_satisfaction" showDialogue={false} />

      <div className="flex-1 ml-[400px] flex items-center justify-center p-8">
        <div className="w-full max-w-3xl mx-auto">
          <GlassCard className="w-full">
            <h2 className="text-2xl lg:text-3xl xl:text-4xl font-bold text-gray-800 mb-4 lg:mb-6 text-center">
              Twoje Doświadczenia
            </h2>

            <p className="text-sm lg:text-base xl:text-lg text-center text-gray-600 mb-6 lg:mb-8">
              Oceń swoje doświadczenia z aplikacją na skali 1-7
            </p>

            <div className="space-y-8 mb-8">
              {SATISFACTION_QUESTIONS.map((question, index) => (
                <div key={question.key} className="border-b border-gray-200 pb-6 last:border-b-0">
                  <div className="mb-4">
                    <span className="inline-block px-3 py-1 bg-gold/20 text-gold text-xs rounded-full mb-2">
                      {question.category}
                    </span>
                    <p className="text-lg text-gray-800">{question.question}</p>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
                    <span>Zdecydowanie nie (1)</span>
                    <span>Zdecydowanie tak (7)</span>
                  </div>

                  <input
                    type="range"
                    min="1"
                    max="7"
                    value={answers[question.key] || 4}
                    onChange={(e) => handleAnswerChange(question.key, parseInt(e.target.value))}
                    className="w-full mb-2"
                  />

                  <div className="text-center">
                    <span className="text-gold font-semibold">
                      Ocena: {answers[question.key] || 4}/7
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-center">
              <GlassButton 
                onClick={handleContinue}
                disabled={!allAnswered}
              >
                Przejdź do drugiej części →
              </GlassButton>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}