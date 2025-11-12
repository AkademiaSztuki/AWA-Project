"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { useProfileWizard } from "@/components/setup/profile/ProfileWizardContext";

const INITIAL_STATE = {
  livingSituation: "",
  lifeVibe: "",
  goals: [] as string[],
};

export default function LifestylePage() {
  const { language } = useLanguage();
  const { profileData, completeStep, goToPreviousStep } = useProfileWizard();
  const [lifestyleData, setLifestyleData] = useState(() => ({
    ...INITIAL_STATE,
    ...profileData.lifestyle,
  }));

  useEffect(() => {
    setLifestyleData((prev) => ({
      ...prev,
      ...profileData.lifestyle,
    }));
  }, [profileData.lifestyle]);

  const livingSituationOptions = useMemo(
    () => [
      { id: "alone", label: { pl: "Sam/Sama", en: "Alone" } },
      { id: "partner", label: { pl: "Z Partnerem", en: "With Partner" } },
      { id: "family", label: { pl: "Rodzina", en: "Family" } },
      { id: "roommates", label: { pl: "Współlokatorzy", en: "Roommates" } },
    ],
    []
  );

  const vibeOptions = useMemo(
    () => [
      { id: "calm", label: { pl: "Spokojny", en: "Calm" } },
      { id: "chaotic", label: { pl: "Chaotyczny", en: "Chaotic" } },
      { id: "creative", label: { pl: "Kreatywny", en: "Creative" } },
      { id: "organized", label: { pl: "Zorganizowany", en: "Organized" } },
      { id: "social", label: { pl: "Społeczny", en: "Social" } },
      { id: "introverted", label: { pl: "Introwertyczny", en: "Introverted" } },
    ],
    []
  );

  const goalOptions = useMemo(
    () => [
      { id: "peace", label: { pl: "Spokój i relaks", en: "Peace and relaxation" } },
      {
        id: "creativity",
        label: { pl: "Kreatywność i inspiracja", en: "Creativity and inspiration" },
      },
      {
        id: "productivity",
        label: { pl: "Produktywność i focus", en: "Productivity and focus" },
      },
      {
        id: "connection",
        label: { pl: "Więź z bliskimi", en: "Connection with loved ones" },
      },
      { id: "privacy", label: { pl: "Prywatność i autonomia", en: "Privacy and autonomy" } },
      { id: "beauty", label: { pl: "Estetyka i piękno", en: "Aesthetics and beauty" } },
    ],
    []
  );

  const canProceed =
    lifestyleData.livingSituation &&
    lifestyleData.lifeVibe &&
    (lifestyleData.goals?.length ?? 0) > 0;

  const updateField = (field: "livingSituation" | "lifeVibe", value: string) => {
    setLifestyleData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleGoal = (goal: string) => {
    setLifestyleData((prev) => {
      const goals = prev.goals || [];
      return goals.includes(goal)
        ? { ...prev, goals: goals.filter((item) => item !== goal) }
        : { ...prev, goals: [...goals, goal] };
    });
  };

  const handleNext = () => {
    completeStep({
      lifestyle: lifestyleData,
    });
  };

  return (
    <GlassCard className="p-6 md:p-8 min-h-[600px] max-h-[85vh] overflow-auto scrollbar-hide">
      <h2 className="text-xl md:text-2xl font-nasalization text-graphite mb-2">
        {language === "pl" ? "Twój Styl Życia" : "Your Lifestyle"}
      </h2>
      <p className="text-graphite font-modern mb-6 text-sm">
        {language === "pl"
          ? "Kilka szybkich pytań o Ciebie..."
          : "A few quick questions about you..."}
      </p>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-graphite mb-2">
            {language === "pl" ? "Z kim mieszkasz?" : "Who do you live with?"}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {livingSituationOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => updateField("livingSituation", option.id)}
                className={`rounded-lg p-4 text-sm font-modern font-semibold transition-all duration-300 cursor-pointer group ${
                  lifestyleData.livingSituation === option.id
                    ? "bg-gold/30 border-2 border-gold text-graphite shadow-lg"
                    : "bg-white/10 border border-white/30 text-graphite hover:bg-gold/10 hover:border-gold/50 hover:text-gold-700"
                }`}
              >
                {option.label[language]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-graphite mb-2">
            {language === "pl"
              ? "Jaki jest vibe Twojego życia teraz?"
              : "What's your life vibe right now?"}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {vibeOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => updateField("lifeVibe", option.id)}
                className={`rounded-lg p-3 text-sm font-modern font-semibold transition-all duration-300 cursor-pointer group ${
                  lifestyleData.lifeVibe === option.id
                    ? "bg-gold/30 border-2 border-gold text-graphite shadow-lg"
                    : "bg-white/10 border border-white/30 text-graphite hover:bg-gold/10 hover:border-gold/50 hover:text-gold-700"
                }`}
              >
                {option.label[language]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-graphite mb-2">
            {language === "pl"
              ? "Co jest dla Ciebie najważniejsze w domu?"
              : "What matters most to you at home?"}
            <span className="text-xs text-silver-dark ml-2">
              ({language === "pl" ? "wybierz kilka" : "select multiple"})
            </span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {goalOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => toggleGoal(option.id)}
                className={`rounded-lg p-4 text-sm font-modern font-semibold transition-all duration-300 cursor-pointer group ${
                  lifestyleData.goals?.includes(option.id)
                    ? "bg-gold/30 border-2 border-gold text-graphite shadow-lg"
                    : "bg-white/10 border border-white/30 text-graphite hover:bg-gold/10 hover:border-gold/50 hover:text-gold-700"
                }`}
              >
                {option.label[language]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
        <GlassButton onClick={goToPreviousStep} variant="secondary">
          <ArrowLeft size={18} className="mr-2" />
          {language === "pl" ? "Wstecz" : "Back"}
        </GlassButton>
        <GlassButton onClick={handleNext} disabled={!canProceed}>
          {language === "pl" ? "Dalej" : "Next"}
          <ArrowRight size={18} className="ml-2" />
        </GlassButton>
      </div>
    </GlassCard>
  );
}
