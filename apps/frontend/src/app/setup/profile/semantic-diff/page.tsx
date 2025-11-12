"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { useProfileWizard } from "@/components/setup/profile/ProfileWizardContext";
import type { CoreProfileData } from "@/components/setup/profile/types";

type SemanticDimension = keyof NonNullable<
  CoreProfileData["semanticDifferential"]
>;

type SemanticAnswers = Partial<
  Record<SemanticDimension, number>
>;

interface SemanticQuestion {
  id: SemanticDimension;
  question: { pl: string; en: string };
  leftLabel: { pl: string; en: string };
  rightLabel: { pl: string; en: string };
  leftImage: string;
  rightImage: string;
}

export default function SemanticDifferentialPage() {
  const { language } = useLanguage();
  const { profileData, updateProfile, completeStep, goToPreviousStep } =
    useProfileWizard();

  const questions = useMemo<SemanticQuestion[]>(
    () => [
      {
        id: "warmth",
        question: {
          pl: "Które wnętrze bardziej TY?",
          en: "Which interior is more YOU?",
        },
        leftLabel: { pl: "Zimne", en: "Cool" },
        rightLabel: { pl: "Ciepłe", en: "Warm" },
        leftImage: "/images/tinder/Living Room (2).jpg",
        rightImage: "/images/tinder/Living Room (1).jpg",
      },
      {
        id: "brightness",
        question: {
          pl: "Które wnętrze bardziej TY?",
          en: "Which interior is more YOU?",
        },
        leftLabel: { pl: "Ciemne", en: "Dark" },
        rightLabel: { pl: "Jasne", en: "Bright" },
        leftImage: "/images/tinder/Living Room (3).jpg",
        rightImage: "/images/tinder/Living Room (1).jpg",
      },
      {
        id: "complexity",
        question: {
          pl: "Które wnętrze bardziej TY?",
          en: "Which interior is more YOU?",
        },
        leftLabel: { pl: "Proste", en: "Simple" },
        rightLabel: { pl: "Złożone", en: "Complex" },
        leftImage: "/images/tinder/Living Room (2).jpg",
        rightImage: "/images/tinder/Living Room (3).jpg",
      },
    ],
    []
  );

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<SemanticAnswers>(
    profileData.semanticDifferential ?? {}
  );

  const current = questions[currentQuestion];

  const handleChoice = (side: "left" | "right") => {
    const value = side === "left" ? 0.2 : 0.8;
    const nextAnswers: SemanticAnswers = { ...answers, [current.id]: value };
    setAnswers(nextAnswers);
    updateProfile({
      semanticDifferential: {
        ...profileData.semanticDifferential,
        ...nextAnswers,
      } as NonNullable<CoreProfileData["semanticDifferential"]>,
    });

    if (currentQuestion + 1 < questions.length) {
      setCurrentQuestion((index) => index + 1);
    } else {
      setTimeout(
        () =>
          completeStep({
            semanticDifferential: {
              ...profileData.semanticDifferential,
              ...nextAnswers,
            } as NonNullable<CoreProfileData["semanticDifferential"]>,
          }),
        300
      );
    }
  };

  return (
    <GlassCard className="p-6 md:p-8 min-h-[600px] max-h-[85vh] overflow-auto scrollbar-hide">
      <h2 className="text-xl md:text-2xl font-nasalization text-graphite mb-2 text-center">
        {current.question[language]}
      </h2>
      <p className="text-graphite font-modern mb-6 text-sm text-center">
        {language === "pl"
          ? "Reaguj intuicyjnie, nie myśl za długo"
          : "React intuitively, don't overthink"}
      </p>

      <div className="mb-6">
        <div className="text-xs text-silver-dark text-center mb-2 font-modern">
          {language === "pl" ? "Pytanie" : "Question"} {currentQuestion + 1} /{" "}
          {questions.length}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <button
          type="button"
          onClick={() => handleChoice("left")}
          className="group relative aspect-[4/3] rounded-xl overflow-hidden border-2 border-white/30 hover:border-gold/50 transition-all hover:scale-[1.02] cursor-pointer"
        >
          <Image
            src={current.leftImage}
            alt={current.leftLabel[language]}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
            <p className="text-white font-modern text-sm font-semibold">
              {current.leftLabel[language]}
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleChoice("right")}
          className="group relative aspect-[4/3] rounded-xl overflow-hidden border-2 border-white/30 hover:border-gold/50 transition-all hover:scale-[1.02] cursor-pointer"
        >
          <Image
            src={current.rightImage}
            alt={current.rightLabel[language]}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
            <p className="text-white font-modern text-sm font-semibold">
              {current.rightLabel[language]}
            </p>
          </div>
        </button>
      </div>

      <div className="flex justify-center">
        <GlassButton onClick={goToPreviousStep} variant="secondary">
          <ArrowLeft size={18} />
          {language === "pl" ? "Wstecz" : "Back"}
        </GlassButton>
      </div>
    </GlassCard>
  );
}
