"use client";

import { useMemo } from "react";
import { Target, ArrowLeft, ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { useHouseholdWizard } from "@/components/setup/household/HouseholdWizardContext";

export default function HouseholdGoalsPage() {
  const { language } = useLanguage();
  const { data, updateData, submitHousehold, goToPreviousStep, isSaving } =
    useHouseholdWizard();

  const goalOptions = useMemo(
    () => [
      { id: "connection", label: language === "pl" ? "Więź" : "Connection" },
      { id: "independence", label: language === "pl" ? "Niezależność" : "Independence" },
      { id: "productivity", label: language === "pl" ? "Produktywność" : "Productivity" },
      { id: "relaxation", label: language === "pl" ? "Relaks" : "Relaxation" },
      { id: "creativity", label: language === "pl" ? "Kreatywność" : "Creativity" },
      { id: "entertaining", label: language === "pl" ? "Goszczenie" : "Entertaining" },
      { id: "family_time", label: language === "pl" ? "Czas z rodziną" : "Family time" },
      { id: "growth", label: language === "pl" ? "Rozwój" : "Personal growth" },
    ],
    [language]
  );

  const toggleGoal = (id: string) => {
    const goals = data.goals.includes(id)
      ? data.goals.filter((goal) => goal !== id)
      : [...data.goals, id];
    updateData({ goals });
  };

  const handleSubmit = async () => {
    await submitHousehold();
  };

  return (
    <GlassCard className="p-6 lg:p-8 min-h-[600px] max-h-[85vh] overflow-auto scrollbar-hide">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold to-champagne flex items-center justify-center">
          <Target size={24} className="text-white" />
        </div>
        <h2 className="text-2xl lg:text-3xl font-nasalization text-graphite">
          {language === "pl" ? "Cele Przestrzeni" : "Space Goals"}
        </h2>
      </div>

      <p className="text-graphite font-modern mb-6">
        {language === "pl"
          ? "Co powinno wspierać to miejsce? (wybierz wszystkie które pasują)"
          : "What should this place support? (select all that apply)"}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
        {goalOptions.map((option) => {
          const isSelected = data.goals.includes(option.id);
          return (
            <button
              key={option.id}
              onClick={() => toggleGoal(option.id)}
              className={`rounded-xl p-4 text-sm font-modern font-semibold transition-all duration-300 cursor-pointer group ${
                isSelected
                  ? "bg-gold/30 border-2 border-gold text-graphite shadow-lg"
                  : "bg-white/10 border border-white/30 text-graphite hover:bg-gold/10 hover:border-gold/50 hover:text-gold-700 hover:scale-105"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="flex justify-between">
        <GlassButton onClick={goToPreviousStep} variant="secondary" disabled={isSaving}>
          <ArrowLeft size={18} />
          {language === "pl" ? "Wstecz" : "Back"}
        </GlassButton>
        <GlassButton
          onClick={handleSubmit}
          disabled={data.goals.length === 0 || isSaving}
        >
          {isSaving
            ? language === "pl"
              ? "Zapisuję..."
              : "Saving..."
            : language === "pl"
            ? "Zapisz i Dodaj Pokój"
            : "Save & Add Room"}
          <ArrowRight size={18} className="ml-2" />
        </GlassButton>
      </div>
    </GlassCard>
  );
}
