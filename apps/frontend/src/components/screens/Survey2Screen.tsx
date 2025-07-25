import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { AwaContainer } from '../awa/AwaContainer';
import { useSessionData } from '@/hooks/useSessionData';

const CLARITY_QUESTIONS = [
  {
    key: 'clarity_understanding',
    question: 'Proces ten pomógł mi lepiej zrozumieć własne preferencje estetyczne.'
  },
  {
    key: 'clarity_articulate',
    question: 'Teraz łatwiej mogę opisać, jaki styl wnętrza mi się podoba.'
  },
  {
    key: 'clarity_confident',
    question: 'Jestem bardziej pewny/na swoich wyborów dotyczących projektowania wnętrz.'
  },
  {
    key: 'clarity_discovered',
    question: 'Odkryłem/am nowe aspekty swojego gustu, o których wcześniej nie wiedziałem/am.'
  },
  {
    key: 'clarity_evolved',
    question: 'Moje preferencje ewoluowały w trakcie korzystania z aplikacji.'
  }
];

export function Survey2Screen() {
  const router = useRouter();
  const { updateSessionData } = useSessionData();
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const handleAnswerChange = (key: string, value: number) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  };

  const handleFinish = () => {
    // Oblicz średnią jasność preferencji
    const clarityScore = CLARITY_QUESTIONS.reduce((sum, q) => sum + (answers[q.key] || 4), 0) / CLARITY_QUESTIONS.length;

    updateSessionData({
      surveyData: {
        clarityAnswers: answers,
        clarityScore,
        survey2Completed: Date.now(),
        sessionCompleted: Date.now()
      }
    });

    router.push('/flow/thanks');
  };

  const allAnswered = CLARITY_QUESTIONS.every(q => answers[q.key] !== undefined);

  return (
    <div className="min-h-screen flex">
      <AwaContainer currentScreen="survey2" />

      <div className="flex-1 ml-[400px] p-8">
        <div className="w-full max-w-3xl mx-auto">
          <GlassCard className="w-full">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
              Jasność Twoich Preferencji
            </h2>

            <p className="text-center text-gray-600 mb-8">
              Ostatnie pytania o krystalizację Twojego gustu estetycznego
            </p>

            <div className="space-y-8 mb-8">
              {CLARITY_QUESTIONS.map((question, index) => (
                <div key={question.key} className="border-b border-gray-200 pb-6 last:border-b-0">
                  <div className="mb-4">
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
                onClick={handleFinish}
                disabled={!allAnswered}
                className="text-xl px-12 py-4"
              >
                Zakończ badanie ✨
              </GlassButton>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}