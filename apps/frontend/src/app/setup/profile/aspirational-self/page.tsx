"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { useProfileWizard } from "@/components/setup/profile/ProfileWizardContext";

interface AspirationalData {
  feelings: string[];
  rituals: string[];
}

const INITIAL_STATE: AspirationalData = {
  feelings: [],
  rituals: [],
};

export default function AspirationalSelfPage() {
  const { language } = useLanguage();
  const { profileData, updateProfile, completeStep, goToPreviousStep } =
    useProfileWizard();

  const [aspirational, setAspirational] = useState<AspirationalData>(() => ({
    ...INITIAL_STATE,
    ...profileData.aspirationalSelf,
  }));

  useEffect(() => {
    if (profileData.aspirationalSelf) {
      setAspirational({
        ...INITIAL_STATE,
        ...profileData.aspirationalSelf,
      });
    }
  }, [profileData.aspirationalSelf]);

  const feelingOptions = [
    {
      id: "calm",
      label: { pl: "Spokojny/a i zrelaksowany/a", en: "Calm and relaxed" },
    },
    {
      id: "energized",
      label: { pl: "Energiczny/a i produktywny/a", en: "Energized and productive" },
    },
    {
      id: "creative",
      label: { pl: "Kreatywny/a i inspirowany/a", en: "Creative and inspired" },
    },
    {
      id: "focused",
      label: { pl: "Skupiony/a i jasny umysł", en: "Focused and clear-minded" },
    },
    {
      id: "connected",
      label: { pl: "Połączony/a z bliskimi", en: "Connected with loved ones" },
    },
    {
      id: "grounded",
      label: { pl: "Uziemiony/a i zbalansowany/a", en: "Grounded and balanced" },
    },
  ];

  const ritualOptions = [
    {
      id: "morning_coffee",
      label: { pl: "Poranna kawa i refleksja", en: "Morning coffee and reflection" },
    },
    {
      id: "evening_reading",
      label: { pl: "Wieczorne czytanie", en: "Evening reading" },
    },
    { id: "yoga", label: { pl: "Joga/medytacja", en: "Yoga/meditation" } },
    { id: "deep_work", label: { pl: "Praca głęboka", en: "Deep work" } },
    { id: "family_time", label: { pl: "Czas z rodziną", en: "Family time" } },
    {
      id: "creative_projects",
      label: { pl: "Kreatywne projekty", en: "Creative projects" },
    },
  ];

  const toggleFeeling = (id: string) => {
    setAspirational((prev) => {
      const feelings = prev.feelings ?? [];
      return feelings.includes(id)
        ? { ...prev, feelings: feelings.filter((item) => item !== id) }
        : { ...prev, feelings: [...feelings, id] };
    });
  };

  const toggleRitual = (id: string) => {
    setAspirational((prev) => {
      const rituals = prev.rituals ?? [];
      return rituals.includes(id)
        ? { ...prev, rituals: rituals.filter((item) => item !== id) }
        : { ...prev, rituals: [...rituals, id] };
    });
  };

  const canProceed =
    (aspirational.feelings?.length ?? 0) > 0 &&
    (aspirational.rituals?.length ?? 0) > 0;

  const handleNext = () => {
    updateProfile({ aspirationalSelf: aspirational });
    completeStep({ aspirationalSelf: aspirational });
  };

  return (
    <GlassCard className="p-6 md:p-8 min-h-[600px] max-h-[85vh] overflow-auto scrollbar-hide">
      <div className="text-center mb-6">
        <h2 className="text-xl md:text-2xl font-nasalization bg-gradient-to-r from-gold to-champagne bg-clip-text text-transparent mb-2">
          {language === "pl" ? "Kim Chcesz Być?" : "Who Do You Want to Be?"}
        </h2>
        <p className="text-graphite font-modern text-sm">
          {language === "pl"
            ? "Projektujemy dla Twojego najlepszego ja, nie obecnego"
            : "We design for your best self, not current self"}
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-graphite mb-2">
            {language === "pl"
              ? "Jak chcesz się czuć w swoim idealnym pokoju?"
              : "How do you want to feel in your ideal room?"}
            <span className="text-xs text-silver-dark ml-2">
              ({language === "pl" ? "wybierz kilka" : "select multiple"})
            </span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {feelingOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => toggleFeeling(option.id)}
                className={`rounded-lg p-4 text-sm font-modern font-semibold transition-all duration-300 cursor-pointer group ${
                  aspirational.feelings?.includes(option.id)
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
              ? "Jakie rytuały chcesz tu praktykować?"
              : "What rituals do you want to practice here?"}
            <span className="text-xs text-silver-dark ml-2">
              ({language === "pl" ? "wybierz kilka" : "select multiple"})
            </span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {ritualOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => toggleRitual(option.id)}
                className={`rounded-lg p-4 text-sm font-modern font-semibold transition-all duration-300 cursor-pointer group ${
                  aspirational.rituals?.includes(option.id)
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
