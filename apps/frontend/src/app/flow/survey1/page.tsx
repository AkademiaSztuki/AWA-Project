"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import GlassSurface from '@/components/ui/GlassSurface';
import { GlassSlider } from '@/components/ui/GlassSlider';
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

export default function Survey1Page() {
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

    // Podziel odpowiedzi na kategorie
    const agencyAnswers: Record<string, number> = {};
    const satisfactionAnswers: Record<string, number> = {};
    
    Object.entries(answers).forEach(([key, value]) => {
      const question = SATISFACTION_QUESTIONS.find(q => q.key === key);
      if (question?.category === 'Agency') {
        agencyAnswers[key] = value;
      } else if (question?.category === 'Satisfaction') {
        satisfactionAnswers[key] = value;
      }
    });

    updateSessionData({
      surveyData: {
        agencyScore,
        satisfactionScore,
        agencyAnswers,
        satisfactionAnswers,
        survey1Completed: Date.now()
      }
    });

    router.push('/flow/survey2');
  };

  const allAnswered = SATISFACTION_QUESTIONS.every(q => answers[q.key] !== undefined);

  return (
    <div className="min-h-screen flex items-center justify-center w-full">
      {/* Development Skip Button */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-4 right-4 z-50">
          <GlassSurface
            width={120}
            height={40}
            borderRadius={20}
            className="cursor-pointer select-none transition-transform duration-200 hover:scale-105 shadow-xl focus:outline-none focus:ring-2 focus:ring-red-400 flex items-center justify-center text-sm font-exo2 font-bold text-white rounded-xl bg-red-500/20 border-red-400/40"
            onClick={() => router.push('/flow/survey2')}
            aria-label="Pomiń (DEV)"
            style={{ opacity: 1 }}
          >
            🚀 Pomiń
          </GlassSurface>
        </div>
      )}

      <div className="w-full max-w-4xl mx-auto">
        <GlassCard className="w-full p-6 md:p-8 bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl rounded-2xl max-h-[90vh] overflow-auto py-6">
            <h1 className="text-2xl md:text-3xl font-exo2 font-bold text-gray-800 mb-3">Twoje Doświadczenia</h1>
            <p className="text-base md:text-lg text-gray-700 font-modern mb-6 leading-relaxed">
              Oceń swoje doświadczenia z aplikacją na skali 1-7
            </p>

            <div className="space-y-6 mb-8">
              {SATISFACTION_QUESTIONS.map((question, index) => (
                <div key={question.key} className="border-b border-gray-200/50 pb-4 last:border-b-0">
                  <p className="text-base md:text-lg text-gray-800 font-modern leading-relaxed mb-3">{question.question}</p>

                  <div className="flex items-center justify-between text-xs md:text-sm text-gray-500 mb-3 font-modern">
                    <span>Zdecydowanie nie (1)</span>
                    <span>Zdecydowanie tak (7)</span>
                  </div>

                  <GlassSlider
                    min={1}
                    max={7}
                    value={answers[question.key] || 4}
                    onChange={(value) => handleAnswerChange(question.key, value)}
                    className="mb-2"
                  />
                </div>
              ))}
            </div>

            <div className="flex flex-col md:flex-row gap-6 justify-center">
              <GlassSurface
                width={220}
                height={56}
                borderRadius={32}
                className="cursor-pointer select-none transition-transform duration-200 hover:scale-105 shadow-xl focus:outline-none focus:ring-2 focus:ring-gold-400 flex items-center justify-center text-base font-exo2 font-bold text-white rounded-2xl"
                onClick={() => router.push('/flow/generate')}
                aria-label="Powrót"
                style={{ opacity: 1 }}
              >
                ← Powrót
              </GlassSurface>
              <GlassSurface
                width={260}
                height={56}
                borderRadius={32}
                className={`cursor-pointer select-none transition-transform duration-200 hover:scale-105 shadow-xl focus:outline-none focus:ring-2 focus:ring-gold-400 flex items-center justify-center text-base md:text-base font-exo2 font-bold text-white rounded-2xl text-nowrap ${!allAnswered ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                onClick={handleContinue}
                aria-label="Przejdź do drugiej części"
                style={{ opacity: 1 }}
              >
                Przejdź do drugiej części →
              </GlassSurface>
            </div>
        </GlassCard>
      </div>
    </div>
  );
}