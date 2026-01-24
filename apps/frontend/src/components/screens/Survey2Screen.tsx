"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard } from '../ui/GlassCard';
import GlassSurface from '../ui/GlassSurface';
import { GlassSlider } from '../ui/GlassSlider';
import { useSessionData } from '@/hooks/useSessionData';
import { supabase } from '@/lib/supabase';
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
  const { language } = useLanguage();
  const { updateSessionData, sessionData } = useSessionData();
  const [answers, setAnswers] = useState<Record<string, number>>({});

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

    // Zapisz do supabase
    await supabase.from('survey_results').insert([
      {
        session_id: sessionData.userHash,
        type: 'clarity',
        answers: answers,
        clarity_score: clarityScore,
        timestamp: new Date().toISOString()
      }
    ]);

    stopAllDialogueAudio(); // Zatrzymaj dźwięk przed nawigacją
    router.push('/flow/thanks');
  };

  const allAnswered = CLARITY_QUESTIONS.every(q => answers[q.key] !== undefined);

  return (
    <div className="min-h-screen flex flex-col w-full">
      <div className="flex-1 flex items-center justify-center p-8">
        

        <div className="w-full max-w-4xl mx-auto">
        <GlassCard variant="flatOnMobile" className="w-full p-6 md:p-8 lg:bg-white/10 lg:backdrop-blur-xl lg:border lg:border-white/20 lg:shadow-xl rounded-2xl max-h-[min(90vh,800px)] overflow-auto">
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

                <GlassSlider
                  min={1}
                  max={7}
                  value={answers[question.key] || 4}
                  onChange={(value) => handleAnswerChange(question.key, value)}
                  className="mb-2"
                  ariaValueText={language === 'pl' ? `Ocena: ${answers[question.key] || 4} z 7` : `Rating: ${answers[question.key] || 4} of 7`}
                />
              </div>
            ))}
          </div>

          <div className="flex justify-center">
            <GlassSurface
              width={280}
              height={56}
              borderRadius={32}
              className={`cursor-pointer select-none transition-transform duration-200 hover:scale-105 shadow-xl focus:outline-none focus:ring-2 focus:ring-gold-400 flex items-center justify-center text-base font-exo2 font-bold text-white rounded-2xl text-nowrap ${!allAnswered ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
              onClick={handleFinish}
              aria-label="Zakończ badanie"
              style={{ opacity: 1 }}
            >
              Zakończ badanie
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