"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Target } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";

interface UsageContextStepProps {
  usageType: "solo" | "shared";
  onUpdate: (usageType: "solo" | "shared") => void;
  onNext: () => void;
  onBack: () => void;
}

export function UsageContextStep({
  usageType,
  onUpdate,
  onNext,
  onBack,
}: UsageContextStepProps) {
  const { language } = useLanguage();
  const [selectedUsage, setSelectedUsage] = useState<string>(usageType || "solo");

  const usageOptions = [
    { id: "solo", label: language === "pl" ? "Tylko ja" : "Just me" },
    { id: "couple", label: language === "pl" ? "Ja i partner/ka" : "Me and partner" },
    { id: "family", label: language === "pl" ? "Rodzina z dziećmi" : "Family with children" },
    { id: "roommates", label: language === "pl" ? "Współlokatorzy" : "Roommates" },
    {
      id: "multigenerational",
      label:
        language === "pl"
          ? "Wielopokoleniowa rodzina"
          : "Multigenerational family",
    },
    {
      id: "shared",
      label: language === "pl" ? "Dzielone z innymi" : "Shared with others",
    },
  ];

  const handleSelect = (optionId: string) => {
    setSelectedUsage(optionId);
    onUpdate(optionId === "solo" ? "solo" : "shared");
  };

  return (
    <motion.div
      key="usage_context"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <GlassCard className="p-6 lg:p-8 min-h-[600px] max-h-[85vh] overflow-auto scrollbar-hide">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold to-champagne flex items-center justify-center">
            <Target size={24} className="text-white" />
          </div>
          <h2 className="text-2xl lg:text-3xl font-nasalization text-graphite">
            {language === "pl" ? "Kto korzysta z przestrzeni?" : "Who uses the space?"}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {usageOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => handleSelect(option.id)}
              className={`rounded-xl p-6 font-modern font-semibold transition-all duration-300 cursor-pointer group ${
                selectedUsage === option.id
                  ? "bg-gold/30 border-2 border-gold text-graphite shadow-lg"
                  : "bg-white/10 border border-white/30 text-graphite hover:bg-gold/10 hover:border-gold/50 hover:text-gold-700"
              }`}
            >
              <p className="text-center leading-tight">{option.label}</p>
            </button>
          ))}
        </div>

        <div className="flex justify-between">
          <GlassButton onClick={onBack} variant="secondary">
            <ArrowLeft size={18} />
            {language === "pl" ? "Wstecz" : "Back"}
          </GlassButton>
          <GlassButton onClick={onNext}>
            {language === "pl" ? "Dalej" : "Next"}
            <ArrowRight size={18} />
          </GlassButton>
        </div>
      </GlassCard>
    </motion.div>
  );
}
