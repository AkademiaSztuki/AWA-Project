"use client";

import { ArrowRight, Home } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { useHouseholdWizard } from "@/components/setup/household/HouseholdWizardContext";

export default function HouseholdNamePage() {
  const { language } = useLanguage();
  const { data, updateData, goToNextStep } = useHouseholdWizard();

  const typeOptions = [
    { id: "home", label: language === "pl" ? "Dom/Mieszkanie" : "Home/Apartment" },
    { id: "office", label: language === "pl" ? "Biuro" : "Office" },
    { id: "vacation", label: language === "pl" ? "Dom wakacyjny" : "Vacation Home" },
    { id: "other", label: language === "pl" ? "Inne" : "Other" },
  ];

  const canProceed = data.name.trim().length > 0;

  return (
    <GlassCard className="p-6 lg:p-8 min-h-[600px] max-h-[85vh] overflow-auto scrollbar-hide">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold to-champagne flex items-center justify-center">
          <Home size={24} className="text-white" />
        </div>
        <h2 className="text-2xl lg:text-3xl font-nasalization text-graphite">
          {language === "pl" ? "Nazwa Przestrzeni" : "Space Name"}
        </h2>
      </div>

      <p className="text-graphite font-modern mb-6">
        {language === "pl"
          ? "Jak nazwiemy tę przestrzeń?"
          : "What should we call this space?"}
      </p>

      <input
        type="text"
        value={data.name}
        onChange={(event) => updateData({ name: event.target.value })}
        placeholder={
          language === "pl"
            ? "np. Mój Dom, Biuro, Apartament..."
            : "e.g. My Home, Office, Apartment..."
        }
        className="w-full glass-panel rounded-xl p-4 font-modern text-graphite placeholder-silver-dark focus:outline-none focus:border-gold/50 transition-colors mb-6"
      />

      <p className="text-sm text-silver-dark font-modern mb-4">
        {language === "pl" ? "Typ przestrzeni:" : "Space type:"}
      </p>

      <div className="grid grid-cols-2 gap-3 mb-8">
        {typeOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => updateData({ type: option.id })}
            className={`rounded-xl p-4 text-sm font-modern font-semibold transition-all duration-300 cursor-pointer group ${
              data.type === option.id
                ? "bg-gold/30 border-2 border-gold text-graphite shadow-lg"
                : "bg-white/10 border border-white/30 text-graphite hover:bg-gold/10 hover:border-gold/50 hover:text-gold-700"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="flex justify-end">
        <GlassButton onClick={goToNextStep} disabled={!canProceed}>
          {language === "pl" ? "Dalej" : "Next"}
          <ArrowRight size={18} className="ml-2" />
        </GlassButton>
      </div>
    </GlassCard>
  );
}
