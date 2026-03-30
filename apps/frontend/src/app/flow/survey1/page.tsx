"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/GlassCard";
import GlassSurface from "@/components/ui/GlassSurface";
import { GlassSlider } from "@/components/ui/GlassSlider";
import { useSessionData } from "@/hooks/useSessionData";
import { gcpApi } from "@/lib/gcp-api-client";
import { stopAllDialogueAudio } from "@/hooks/useAudioManager";
import { AwaDialogue } from "@/components/awa";
import { useLanguage } from "@/contexts/LanguageContext";
import { LocalizedText } from "@/lib/questions/validated-scales";

// System Usability Scale (SUS) - 10 pytań
const SUS_QUESTIONS: Array<{
  key: string;
  question: LocalizedText;
  isPositive: boolean;
}> = [
  {
    key: "sus_1",
    question: {
      pl: "Myślę, że chciałbym/chciałabym używać tego systemu często.",
      en: "I think that I would like to use this system frequently.",
    },
    isPositive: true,
  },
  {
    key: "sus_2",
    question: {
      pl: "Uznałem/am ten system za niepotrzebnie skomplikowany.",
      en: "I found the system unnecessarily complex.",
    },
    isPositive: false,
  },
  {
    key: "sus_3",
    question: {
      pl: "Uznałem/am ten system za łatwy w użyciu.",
      en: "I thought the system was easy to use.",
    },
    isPositive: true,
  },
  {
    key: "sus_4",
    question: {
      pl: "Myślę, że potrzebowałbym/abym wsparcia technicznego, aby używać tego systemu.",
      en: "I think that I would need the support of a technical person to be able to use this system.",
    },
    isPositive: false,
  },
  {
    key: "sus_5",
    question: {
      pl: "Uznałem/am, że różne funkcje w tym systemie były dobrze zintegrowane.",
      en: "I found the various functions in this system were well integrated.",
    },
    isPositive: true,
  },
  {
    key: "sus_6",
    question: {
      pl: "Uznałem/am, że w tym systemie było zbyt dużo niespójności.",
      en: "I thought there was too much inconsistency in this system.",
    },
    isPositive: false,
  },
  {
    key: "sus_7",
    question: {
      pl: "Wyobrażam sobie, że większość ludzi nauczyłaby się używać tego systemu bardzo szybko.",
      en: "I would imagine that most people would learn to use this system very quickly.",
    },
    isPositive: true,
  },
  {
    key: "sus_8",
    question: {
      pl: "Uznałem/am ten system za bardzo uciążliwy w użyciu.",
      en: "I found the system very cumbersome to use.",
    },
    isPositive: false,
  },
  {
    key: "sus_9",
    question: {
      pl: "Czułem/am się bardzo pewnie używając tego systemu.",
      en: "I felt very confident using the system.",
    },
    isPositive: true,
  },
  {
    key: "sus_10",
    question: {
      pl: "Musiałem/am się nauczyć wielu rzeczy, zanim mogłem/am zacząć korzystać z tego systemu.",
      en: "I needed to learn a lot of things before I could get going with this system.",
    },
    isPositive: false,
  },
];

/** Agency + satisfaction (1–7), aligned with `participants.agency_answers` / `satisfaction_answers`. */
const AGENCY_SAT_QUESTIONS: Array<{
  key: string;
  question: LocalizedText;
  category: "Agency" | "Satisfaction";
}> = [
  {
    key: "agency_control",
    category: "Agency",
    question: {
      pl: "Czułem/am, że to ja kontrolowałem/am wynik końcowy.",
      en: "I felt that I controlled the final outcome.",
    },
  },
  {
    key: "agency_decisions",
    category: "Agency",
    question: {
      pl: "Wizualizacje odzwierciedlały moje decyzje.",
      en: "The visualizations reflected my decisions.",
    },
  },
  {
    key: "agency_influence",
    category: "Agency",
    question: {
      pl: "Miałem/am realny wpływ na proces projektowania.",
      en: "I had a real influence on the design process.",
    },
  },
  {
    key: "satisfaction_ease",
    category: "Satisfaction",
    question: {
      pl: "Korzystanie z narzędzia było łatwe i intuicyjne.",
      en: "Using the tool was easy and intuitive.",
    },
  },
  {
    key: "satisfaction_enjoyable",
    category: "Satisfaction",
    question: {
      pl: "Proces był przyjemny i angażujący.",
      en: "The process was enjoyable and engaging.",
    },
  },
  {
    key: "satisfaction_useful",
    category: "Satisfaction",
    question: {
      pl: "Narzędzie było przydatne do odkrywania moich preferencji.",
      en: "The tool was useful for discovering my preferences.",
    },
  },
  {
    key: "satisfaction_recommend",
    category: "Satisfaction",
    question: {
      pl: "Poleciłbym/ałbym to narzędzie innym osobom.",
      en: "I would recommend this tool to others.",
    },
  },
];

const SUS_TEXTS = {
  title: {
    pl: "System Usability Scale (SUS)",
    en: "System Usability Scale (SUS)",
  } as LocalizedText,
  description: {
    pl: "Oceń użyteczność systemu na skali 1–5. Pytania dotyczą Twojego doświadczenia z aplikacją.",
    en: "Rate system usability on a scale of 1–5. Questions relate to your experience with the application.",
  } as LocalizedText,
  scaleLabels: {
    stronglyDisagree: {
      pl: "Zdecydowanie nie (1)",
      en: "Strongly disagree (1)",
    } as LocalizedText,
    neither: {
      pl: "Ani tak, ani nie (3)",
      en: "Neither (3)",
    } as LocalizedText,
    stronglyAgree: {
      pl: "Zdecydowanie tak (5)",
      en: "Strongly agree (5)",
    } as LocalizedText,
  },
  buttons: {
    back: {
      pl: "← Powrót",
      en: "← Back",
    } as LocalizedText,
    nextSus: {
      pl: "Przejdź do drugiej części →",
      en: "Continue to part 2 →",
    } as LocalizedText,
    nextFinal: {
      pl: "Przejdź dalej →",
      en: "Continue →",
    } as LocalizedText,
  },
  ariaLabels: {
    back: {
      pl: "Powrót",
      en: "Back",
    } as LocalizedText,
    nextSus: {
      pl: "Przejdź do drugiej części",
      en: "Continue to part 2",
    } as LocalizedText,
    nextFinal: {
      pl: "Przejdź dalej",
      en: "Continue",
    } as LocalizedText,
  },
};

const EXP_TEXTS = {
  title: {
    pl: "Twoje doświadczenia",
    en: "Your experience",
  } as LocalizedText,
  description: {
    pl: "Oceń swoje doświadczenia z aplikacją na skali 1–7.",
    en: "Rate your experience with the application on a scale of 1–7.",
  } as LocalizedText,
  scaleMin: {
    pl: "Zdecydowanie nie (1)",
    en: "Strongly disagree (1)",
  } as LocalizedText,
  scaleMax: {
    pl: "Zdecydowanie tak (7)",
    en: "Strongly agree (7)",
  } as LocalizedText,
};

function calculateSUSScore(answers: Record<string, number>): number {
  let totalScore = 0;

  SUS_QUESTIONS.forEach((q) => {
    const answer = answers[q.key];

    if (answer < 1 || answer > 5) {
      console.warn(`Invalid answer for ${q.key}: ${answer}`);
      return;
    }

    if (q.isPositive) {
      totalScore += answer - 1;
    } else {
      totalScore += 5 - answer;
    }
  });

  return Math.round(totalScore * 2.5 * 10) / 10;
}

function pickAnswers<K extends string>(
  keys: readonly K[],
  source: Record<string, number>,
): Record<K, number> {
  const out = {} as Record<K, number>;
  for (const k of keys) {
    out[k] = source[k] ?? 4;
  }
  return out;
}

const AGENCY_KEYS = ["agency_control", "agency_decisions", "agency_influence"] as const;
const SATISFACTION_KEYS = [
  "satisfaction_ease",
  "satisfaction_enjoyable",
  "satisfaction_useful",
  "satisfaction_recommend",
] as const;

async function persistSurvey(
  userHash: string,
  type: "sus" | "agency" | "satisfaction",
  answers: Record<string, number>,
  score: number,
): Promise<void> {
  if (!gcpApi.isConfigured()) {
    return;
  }
  const call = () =>
    gcpApi.research.survey({
      userHash,
      type,
      answers,
      score,
    });
  if (process.env.NEXT_PUBLIC_GCP_PERSISTENCE_MODE === "primary") {
    await call();
  } else {
    await call().catch(() => {});
  }
}

export default function Survey1Page() {
  const router = useRouter();
  const { updateSessionData, sessionData } = useSessionData();
  const { t, language } = useLanguage();
  const [step, setStep] = useState<"sus" | "experience">("sus");

  const [susAnswers, setSusAnswers] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    SUS_QUESTIONS.forEach((q) => {
      initial[q.key] = 3;
    });
    return initial;
  });

  const [expAnswers, setExpAnswers] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    AGENCY_SAT_QUESTIONS.forEach((q) => {
      initial[q.key] = 4;
    });
    return initial;
  });

  const handleSusChange = (key: string, value: number) => {
    setSusAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const handleExpChange = (key: string, value: number) => {
    setExpAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const handleSusContinue = async () => {
    const susScore = calculateSUSScore(susAnswers);
    stopAllDialogueAudio();

    updateSessionData({
      surveyData: {
        ...sessionData?.surveyData,
        susScore,
        susAnswers: susAnswers,
      },
    });

    try {
      await persistSurvey(sessionData?.userHash || "", "sus", susAnswers, susScore);
    } catch (e) {
      console.error("Error saving SUS survey:", e);
    }

    setStep("experience");
  };

  const handleExperienceFinish = async () => {
    const agencyQs = AGENCY_SAT_QUESTIONS.filter((q) => q.category === "Agency");
    const satQs = AGENCY_SAT_QUESTIONS.filter((q) => q.category === "Satisfaction");

    const agencyScore =
      agencyQs.reduce((sum, q) => sum + (expAnswers[q.key] ?? 4), 0) / agencyQs.length;
    const satisfactionScore =
      satQs.reduce((sum, q) => sum + (expAnswers[q.key] ?? 4), 0) / satQs.length;

    const agencyAnswers = pickAnswers(AGENCY_KEYS, expAnswers);
    const satisfactionAnswers = pickAnswers(SATISFACTION_KEYS, expAnswers);

    stopAllDialogueAudio();

    updateSessionData({
      surveyData: {
        ...sessionData?.surveyData,
        susScore: sessionData?.surveyData?.susScore,
        susAnswers: sessionData?.surveyData?.susAnswers,
        agencyScore,
        satisfactionScore,
        agencyAnswers,
        satisfactionAnswers,
        survey1Completed: Date.now(),
      },
    });

    const uh = sessionData?.userHash || "";
    try {
      await persistSurvey(uh, "agency", agencyAnswers as Record<string, number>, agencyScore);
      await persistSurvey(
        uh,
        "satisfaction",
        satisfactionAnswers as Record<string, number>,
        satisfactionScore,
      );
    } catch (e) {
      console.error("Error saving agency/satisfaction survey:", e);
    }

    router.push("/flow/survey2");
  };

  const susAllAnswered = SUS_QUESTIONS.every((q) => susAnswers[q.key] !== undefined);
  const expAllAnswered = AGENCY_SAT_QUESTIONS.every((q) => expAnswers[q.key] !== undefined);

  return (
    <div className="min-h-screen flex flex-col w-full">
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-full lg:max-w-4xl mx-auto">
          <GlassCard
            variant="flatOnMobile"
            className="w-full p-6 md:p-8 lg:bg-white/10 lg:backdrop-blur-xl lg:border lg:border-white/20 lg:shadow-xl rounded-2xl max-h-[min(90vh,900px)] overflow-auto py-6"
          >
            {step === "sus" ? (
              <>
                <h1 className="text-2xl md:text-3xl font-exo2 font-bold text-gray-800 mb-3">
                  {t(SUS_TEXTS.title)}
                </h1>
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
                        value={susAnswers[question.key]}
                        onChange={(value) => handleSusChange(question.key, value)}
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
                    onClick={() => router.push("/flow/generate")}
                    aria-label={t(SUS_TEXTS.ariaLabels.back)}
                    style={{ opacity: 1 }}
                  >
                    {t(SUS_TEXTS.buttons.back)}
                  </GlassSurface>
                  <GlassSurface
                    width={260}
                    height={56}
                    borderRadius={32}
                    className={`w-full md:w-auto cursor-pointer select-none transition-transform duration-200 hover:scale-105 shadow-xl focus:outline-none focus:ring-2 focus:ring-gold-400 flex items-center justify-center text-base md:text-base font-exo2 font-bold text-white rounded-2xl text-nowrap ${!susAllAnswered ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}`}
                    onClick={() => void handleSusContinue()}
                    aria-label={t(SUS_TEXTS.ariaLabels.nextSus)}
                    style={{ opacity: 1 }}
                  >
                    {t(SUS_TEXTS.buttons.nextSus)}
                  </GlassSurface>
                </div>
              </>
            ) : (
              <>
                <h1 className="text-2xl md:text-3xl font-exo2 font-bold text-gray-800 mb-3">
                  {t(EXP_TEXTS.title)}
                </h1>
                <p className="text-base md:text-lg text-gray-700 font-modern mb-6 leading-relaxed">
                  {t(EXP_TEXTS.description)}
                </p>

                <div className="space-y-6 mb-8">
                  {AGENCY_SAT_QUESTIONS.map((question, index) => (
                    <div key={question.key} className="border-b border-gray-200/50 pb-4 last:border-b-0">
                      <p className="text-base md:text-lg text-gray-800 font-modern leading-relaxed mb-3">
                        {index + 1}. {t(question.question)}
                      </p>

                      <div className="flex items-center justify-between text-xs md:text-sm text-gray-500 mb-3 font-modern">
                        <span>{t(EXP_TEXTS.scaleMin)}</span>
                        <span>{t(EXP_TEXTS.scaleMax)}</span>
                      </div>

                      <GlassSlider
                        min={1}
                        max={7}
                        value={expAnswers[question.key] ?? 4}
                        onChange={(value) => handleExpChange(question.key, value)}
                        className="mb-2"
                        ariaValueText={
                          language === "pl"
                            ? `Ocena: ${expAnswers[question.key] ?? 4} z 7`
                            : `Rating: ${expAnswers[question.key] ?? 4} of 7`
                        }
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
                    onClick={() => setStep("sus")}
                    aria-label={t(SUS_TEXTS.ariaLabels.back)}
                    style={{ opacity: 1 }}
                  >
                    {t(SUS_TEXTS.buttons.back)}
                  </GlassSurface>
                  <GlassSurface
                    width={260}
                    height={56}
                    borderRadius={32}
                    className={`w-full md:w-auto cursor-pointer select-none transition-transform duration-200 hover:scale-105 shadow-xl focus:outline-none focus:ring-2 focus:ring-gold-400 flex items-center justify-center text-base md:text-base font-exo2 font-bold text-white rounded-2xl text-nowrap ${!expAllAnswered ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}`}
                    onClick={() => void handleExperienceFinish()}
                    aria-label={t(SUS_TEXTS.ariaLabels.nextFinal)}
                    style={{ opacity: 1 }}
                  >
                    {t(SUS_TEXTS.buttons.nextFinal)}
                  </GlassSurface>
                </div>
              </>
            )}
          </GlassCard>
        </div>
      </div>

      <div className="w-full">
        <AwaDialogue currentStep="survey_satisfaction" fullWidth={true} autoHide={true} />
      </div>
    </div>
  );
}
