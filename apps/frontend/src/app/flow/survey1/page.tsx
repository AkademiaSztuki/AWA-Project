"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import GlassSurface from '@/components/ui/GlassSurface';
import { GlassSlider } from '@/components/ui/GlassSlider';
import { useSessionData } from '@/hooks/useSessionData';
import { supabase } from '@/lib/supabase';
import { stopAllDialogueAudio } from '@/hooks/useAudioManager';
import { AwaDialogue } from '@/components/awa';
import { useLanguage } from '@/contexts/LanguageContext';
import { LocalizedText } from '@/lib/questions/validated-scales';

// System Usability Scale (SUS) - 10 pytań
// Pytania nieparzyste (1,3,5,7,9) są pozytywne
// Pytania parzyste (2,4,6,8,10) są negatywne
const SUS_QUESTIONS: Array<{
  key: string;
  question: LocalizedText;
  isPositive: boolean;
}> = [
  {
    key: 'sus_1',
    question: {
      pl: 'Myślę, że chciałbym/chciałabym używać tego systemu często.',
      en: 'I think that I would like to use this system frequently.'
    },
    isPositive: true
  },
  {
    key: 'sus_2',
    question: {
      pl: 'Uznałem/am ten system za niepotrzebnie skomplikowany.',
      en: 'I found the system unnecessarily complex.'
    },
    isPositive: false
  },
  {
    key: 'sus_3',
    question: {
      pl: 'Uznałem/am ten system za łatwy w użyciu.',
      en: 'I thought the system was easy to use.'
    },
    isPositive: true
  },
  {
    key: 'sus_4',
    question: {
      pl: 'Myślę, że potrzebowałbym/abym wsparcia technicznego, aby używać tego systemu.',
      en: 'I think that I would need the support of a technical person to be able to use this system.'
    },
    isPositive: false
  },
  {
    key: 'sus_5',
    question: {
      pl: 'Uznałem/am, że różne funkcje w tym systemie były dobrze zintegrowane.',
      en: 'I found the various functions in this system were well integrated.'
    },
    isPositive: true
  },
  {
    key: 'sus_6',
    question: {
      pl: 'Uznałem/am, że w tym systemie było zbyt dużo niespójności.',
      en: 'I thought there was too much inconsistency in this system.'
    },
    isPositive: false
  },
  {
    key: 'sus_7',
    question: {
      pl: 'Wyobrażam sobie, że większość ludzi nauczyłaby się używać tego systemu bardzo szybko.',
      en: 'I would imagine that most people would learn to use this system very quickly.'
    },
    isPositive: true
  },
  {
    key: 'sus_8',
    question: {
      pl: 'Uznałem/am ten system za bardzo uciążliwy w użyciu.',
      en: 'I found the system very cumbersome to use.'
    },
    isPositive: false
  },
  {
    key: 'sus_9',
    question: {
      pl: 'Czułem/am się bardzo pewnie używając tego systemu.',
      en: 'I felt very confident using the system.'
    },
    isPositive: true
  },
  {
    key: 'sus_10',
    question: {
      pl: 'Musiałem/am się nauczyć wielu rzeczy, zanim mogłem/am zacząć korzystać z tego systemu.',
      en: 'I needed to learn a lot of things before I could get going with this system.'
    },
    isPositive: false
  }
];

const SUS_TEXTS = {
  title: {
    pl: 'System Usability Scale (SUS)',
    en: 'System Usability Scale (SUS)'
  } as LocalizedText,
  description: {
    pl: 'Oceń użyteczność systemu na skali 1-5. Pytania dotyczą Twojego doświadczenia z aplikacją.',
    en: 'Rate the system usability on a scale of 1-5. Questions relate to your experience with the application.'
  } as LocalizedText,
  scaleLabels: {
    stronglyDisagree: {
      pl: 'Zdecydowanie nie (1)',
      en: 'Strongly disagree (1)'
    } as LocalizedText,
    neither: {
      pl: 'Ani tak, ani nie (3)',
      en: 'Neither (3)'
    } as LocalizedText,
    stronglyAgree: {
      pl: 'Zdecydowanie tak (5)',
      en: 'Strongly agree (5)'
    } as LocalizedText
  },
  buttons: {
    back: {
      pl: '← Powrót',
      en: '← Back'
    } as LocalizedText,
    next: {
      pl: 'Przejdź do drugiej części →',
      en: 'Continue to next part →'
    } as LocalizedText
  },
  ariaLabels: {
    back: {
      pl: 'Powrót',
      en: 'Back'
    } as LocalizedText,
    next: {
      pl: 'Przejdź do drugiej części',
      en: 'Continue to next part'
    } as LocalizedText
  }
};

/**
 * Oblicza wynik SUS (0-100) na podstawie odpowiedzi
 * Dla pytań pozytywnych: score = answer - 1
 * Dla pytań negatywnych: score = 5 - answer
 * Suma wszystkich * 2.5 = wynik SUS
 * 
 * UWAGA: Funkcja zakłada, że wszystkie odpowiedzi są wypełnione (1-5)
 */
function calculateSUSScore(answers: Record<string, number>): number {
  let totalScore = 0;

  SUS_QUESTIONS.forEach((q) => {
    const answer = answers[q.key];
    
    // Walidacja - powinno być między 1-5
    if (answer < 1 || answer > 5) {
      console.warn(`Invalid answer for ${q.key}: ${answer}`);
      return; // Skip this question, continue with next
    }

    if (q.isPositive) {
      // Pytania pozytywne (nieparzyste): score = answer - 1
      totalScore += answer - 1;
    } else {
      // Pytania negatywne (parzyste): score = 5 - answer
      totalScore += 5 - answer;
    }
  });

  // Pomnóż przez 2.5, aby uzyskać wynik 0-100
  return Math.round(totalScore * 2.5 * 10) / 10; // Zaokrąglenie do 1 miejsca po przecinku
}

export default function Survey1Page() {
  const router = useRouter();
  const { updateSessionData, sessionData } = useSessionData();
  const { t, language } = useLanguage();
  // Initialize answers with default value of 3 for all questions
  const [answers, setAnswers] = useState<Record<string, number>>(() => {
    const initialAnswers: Record<string, number> = {};
    SUS_QUESTIONS.forEach(q => {
      initialAnswers[q.key] = 3; // Default value
    });
    return initialAnswers;
  });

  const handleAnswerChange = (key: string, value: number) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  };

  const handleContinue = async () => {
    // Oblicz wynik SUS (0-100)
    const susScore = calculateSUSScore(answers);

    stopAllDialogueAudio(); // Zatrzymaj dźwięk przed nawigacją
    
    updateSessionData({
      surveyData: {
        susScore,
        susAnswers: answers,
        survey1Completed: Date.now()
      }
    });
    
    // Zapis do Supabase (survey_results)
    try {
      await supabase.from('survey_results').insert([
        {
          session_id: sessionData?.userHash || '',
          type: 'sus',
          answers: answers,
          sus_score: susScore,
          timestamp: new Date().toISOString(),
        }
      ]);
    } catch (e) {
      console.error('Error saving SUS survey:', e);
      // ignore
    }

    router.push('/flow/survey2');
  };

  const allAnswered = SUS_QUESTIONS.every(q => answers[q.key] !== undefined);

  return (
    <div className="min-h-screen flex flex-col w-full">
      <div className="flex-1 flex items-center justify-center p-8">
        

        <div className="w-full max-w-full lg:max-w-4xl mx-auto">
        <GlassCard className="w-full p-6 md:p-8 bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl rounded-2xl max-h-[90vh] overflow-auto py-6">
            <h1 className="text-2xl md:text-3xl font-exo2 font-bold text-gray-800 mb-3">{t(SUS_TEXTS.title)}</h1>
            <p className="text-base md:text-lg text-gray-700 font-modern mb-6 leading-relaxed">
              {t(SUS_TEXTS.description)}
            </p>

            <div className="space-y-6 mb-8">
              {SUS_QUESTIONS.map((question, index) => (
                <div key={question.key} className="border-b border-gray-200/50 pb-4 last:border-b-0">
                  <p className="text-base md:text-lg text-gray-800 font-modern leading-relaxed mb-3">
                    {index + 1}. {t(question.question)}
                  </p>

                  <div className="flex items-center justify-between text-xs md:text-sm text-gray-500 mb-3 font-modern">
                    <span>{t(SUS_TEXTS.scaleLabels.stronglyDisagree)}</span>
                    <span>{t(SUS_TEXTS.scaleLabels.neither)}</span>
                    <span>{t(SUS_TEXTS.scaleLabels.stronglyAgree)}</span>
                  </div>

                  <GlassSlider
                    min={1}
                    max={5}
                    value={answers[question.key]}
                    onChange={(value) => handleAnswerChange(question.key, value)}
                    className="mb-2"
                  />
                </div>
              ))}
            </div>

            <div className="flex flex-col md:flex-row gap-3 sm:gap-6 justify-center items-stretch md:items-center">
              <GlassSurface
                width={220}
                height={56}
                borderRadius={32}
                className="w-full md:w-auto cursor-pointer select-none transition-transform duration-200 hover:scale-105 shadow-xl focus:outline-none focus:ring-2 focus:ring-gold-400 flex items-center justify-center text-base font-exo2 font-bold text-white rounded-2xl"
                onClick={() => router.push('/flow/generate')}
                aria-label={t(SUS_TEXTS.ariaLabels.back)}
                style={{ opacity: 1 }}
              >
                {t(SUS_TEXTS.buttons.back)}
              </GlassSurface>
              <GlassSurface
                width={260}
                height={56}
                borderRadius={32}
                className={`w-full md:w-auto cursor-pointer select-none transition-transform duration-200 hover:scale-105 shadow-xl focus:outline-none focus:ring-2 focus:ring-gold-400 flex items-center justify-center text-base md:text-base font-exo2 font-bold text-white rounded-2xl text-nowrap ${!allAnswered ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                onClick={handleContinue}
                aria-label={t(SUS_TEXTS.ariaLabels.next)}
                style={{ opacity: 1 }}
              >
                {t(SUS_TEXTS.buttons.next)}
              </GlassSurface>
            </div>
        </GlassCard>
        </div>
      </div>

      {/* Dialog IDA na dole - cała szerokość */}
      <div className="w-full">
        <AwaDialogue 
          currentStep="survey_satisfaction" 
          fullWidth={true}
          autoHide={true}
        />
      </div>
    </div>
  );
}