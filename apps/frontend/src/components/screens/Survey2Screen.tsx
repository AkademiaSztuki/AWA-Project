"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard } from '../ui/GlassCard';
import GlassSurface from '../ui/GlassSurface';
import { GlassScalePicker } from '../ui/GlassScalePicker';
import { FULL_FLOW_GLASS_SHELL } from '@/lib/flow/glass-step-layout';
import { useSessionData } from '@/hooks/useSessionData';
import { gcpApi } from '@/lib/gcp-api-client';
import { stopAllDialogueAudio } from '@/hooks/useAudioManager';
import { AwaDialogue } from '@/components/awa';

import { useLanguage } from '@/contexts/LanguageContext';

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
  const { language, tp } = useLanguage();
  const { updateSessionData, sessionData } = useSessionData();
  const [answers, setAnswers] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    CLARITY_QUESTIONS.forEach((q) => {
      initial[q.key] = 4;
    });
    return initial;
  });

  const handleAnswerChange = (key: string, value: number) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  };

  const handleFinish = async () => {
    // Oblicz średnią jasność preferencji
    const clarityScore = CLARITY_QUESTIONS.reduce((sum, q) => sum + (answers[q.key] || 4), 0) / CLARITY_QUESTIONS.length;

    updateSessionData({
      surveyData: {
        ...sessionData.surveyData, // zachowaj poprzednie odpowiedzi
        clarityAnswers: answers,
        clarityScore,
        survey2Completed: Date.now(),
        sessionCompleted: Date.now()
      }
    });

    // Persist detailed survey answers (best-effort — lokalna sesja jest już zapisana)
    await gcpApi
      .research.survey({
        userHash: sessionData.userHash,
        type: 'clarity',
        answers,
        score: clarityScore,
      })
      .catch(() => {});

    stopAllDialogueAudio(); // Zatrzymaj dźwięk przed nawigacją
    router.push('/flow/thanks');
  };

  const allAnswered = CLARITY_QUESTIONS.every(q => answers[q.key] !== undefined);

  const handleBack = () => {
    stopAllDialogueAudio();
    router.push('/flow/survey1');
  };

  return (
    <div className="w-full flex flex-col">
      <div className="w-full flex flex-col items-stretch p-3 sm:p-4 lg:p-6">
        <div className={`${FULL_FLOW_GLASS_SHELL} w-full`}>
        <GlassCard variant="flatOnMobile" className="w-full p-6 md:p-8 lg:bg-white/10 lg:backdrop-blur-xl lg:border lg:border-white/20 lg:shadow-xl rounded-2xl">
          <h1 className="text-2xl md:text-3xl font-exo2 font-bold text-gray-800 mb-3">Jasność Twoich Preferencji</h1>
          <p className="text-base md:text-lg text-gray-700 font-modern mb-6 leading-relaxed" aria-live="polite">
            Ostatnie pytania o krystalizację Twojego gustu estetycznego
          </p>

          <div className="space-y-6 mb-8">
            {CLARITY_QUESTIONS.map((question, index) => (
              <div key={question.key} className="border-b border-gray-200/50 pb-4 last:border-b-0">
                <p className="text-base md:text-lg text-gray-800 font-modern leading-relaxed mb-3">{question.question}</p>

                <div className="flex items-center justify-between text-xs md:text-sm text-gray-500 mb-3 font-modern">
                  <span>Zdecydowanie nie (1)</span>
                  <span>Zdecydowanie tak (7)</span>
                </div>

                <GlassScalePicker
                  min={1}
                  max={7}
                  value={answers[question.key] ?? 4}
                  onChange={(value) => handleAnswerChange(question.key, value)}
                  className="mb-2"
                  ariaLabel={
                    language === 'pl'
                      ? `Pytanie ${index + 1}: ${question.question} (1–7), wybrano ${answers[question.key] ?? 4}`
                      : `Question ${index + 1}: ${question.question} (1–7), selected ${answers[question.key] ?? 4}`
                  }
                />
              </div>
            ))}
          </div>

          <div className="flex w-full flex-col md:flex-row gap-3 sm:gap-6 justify-center items-stretch md:items-center">
            <GlassSurface
              width={220}
              height={56}
              borderRadius={32}
              className="!w-full md:!w-auto cursor-pointer select-none transition-transform duration-200 hover:scale-105 shadow-xl focus:outline-none focus:ring-2 focus:ring-gold-400 flex items-center justify-center text-base font-exo2 font-bold text-white rounded-2xl"
              onClick={handleBack}
              aria-label={tp('Powrót', 'Back')}
            >
              {tp('← Powrót', '← Back')}
            </GlassSurface>
            <GlassSurface
              width={280}
              height={56}
              borderRadius={32}
              className={`!w-full md:!w-auto cursor-pointer select-none transition-transform duration-200 hover:scale-105 shadow-xl focus:outline-none focus:ring-2 focus:ring-gold-400 flex items-center justify-center text-base font-exo2 font-bold text-white rounded-2xl text-nowrap ${!allAnswered ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
              onClick={handleFinish}
              aria-label={tp('Zakończ', 'Finish')}
              aria-disabled={!allAnswered}
            >
              {tp('Zakończ', 'Finish')}
            </GlassSurface>
          </div>
        </GlassCard>
        </div>
      </div>

      {/* Dialog IDA na dole - cała szerokość */}
      <div className="w-full">
        <AwaDialogue 
          currentStep="survey_clarity" 
          fullWidth={true}
          autoHide={true}
        />
      </div>
    </div>
  );
}