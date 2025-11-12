"use client";

import { Users, ArrowLeft, ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { useHouseholdWizard } from "@/components/setup/household/HouseholdWizardContext";

export default function HouseholdLivingPage() {
  const { language } = useLanguage();
  const { data, updateData, goToNextStep, goToPreviousStep } =
    useHouseholdWizard();

  const options = [
    { id: "alone", label: language === "pl" ? "Sam/sama" : "Alone" },
    { id: "partner", label: language === "pl" ? "Z partnerem/partnerką" : "With partner" },
    { id: "family", label: language === "pl" ? "Z rodziną" : "With family" },
    { id: "roommates", label: language === "pl" ? "Ze współlokatorami" : "With roommates" },
  ];

  return (
    <GlassCard className="p-6 lg:p-8 min-h-[600px] max-h-[85vh] overflow-auto scrollbar-hide">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold to-champagne flex items-center justify-center">
          <Users size={24} className="text-white" />
        </div>
        <h2 className="text-2xl lg:text-3xl font-nasalization text-graphite">
          {language === "pl" ? "Kto Tu Mieszka?" : "Who Lives Here?"}
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {options.map((option) => (
          <button
            key={option.id}
            onClick={() => updateData({ livingSituation: option.id })}
            className={`rounded-xl p-6 font-modern font-semibold transition-all duration-300 cursor-pointer group ${
              data.livingSituation === option.id
                ? "bg-gold/30 border-2 border-gold text-graphite shadow-lg"
                : "bg-white/10 border border-white/30 text-graphite hover:bg-gold/10 hover:border-gold/50 hover:text-gold-700"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="flex justify-between">
        <GlassButton onClick={goToPreviousStep} variant="secondary">
          <ArrowLeft size={18} />
          {language === "pl" ? "Wstecz" : "Back"}
        </GlassButton>
        <GlassButton onClick={goToNextStep} disabled={!data.livingSituation}>
          {language === "pl" ? "Dalej" : "Next"}
          <ArrowRight size={18} />
        </GlassButton>
      </div>
    </GlassCard>
  );
}
