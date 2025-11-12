"use client";

import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, AlertCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { PAIN_POINTS } from "@/lib/questions/adaptive-questions";

interface PainPointsStepProps {
  selected: string[];
  onUpdate: (painPoints: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export function PainPointsStep({
  selected,
  onUpdate,
  onNext,
  onBack,
}: PainPointsStepProps) {
  const { t, language } = useLanguage();

  const togglePainPoint = (id: string) => {
    const updated = selected.includes(id)
      ? selected.filter((point) => point !== id)
      : [...selected, id];
    onUpdate(updated);
  };

  return (
    <motion.div
      key="pain_points"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <GlassCard className="p-6 lg:p-8 min-h-[600px] max-h-[85vh] overflow-auto scrollbar-hide">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold to-champagne flex items-center justify-center">
            <AlertCircle size={24} className="text-white" />
          </div>
          <h2 className="text-2xl lg:text-3xl font-nasalization text-graphite">
            {language === "pl" ? "Co Cię irytuje?" : "What Bothers You?"}
          </h2>
        </div>

        <p className="text-graphite font-modern mb-6">
          {language === "pl"
            ? "Wybierz wszystkie problemy które chciałbyś rozwiązać"
            : "Select all problems you'd like to solve"}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
          {PAIN_POINTS.map((point) => {
            const isSelected = selected.includes(point.id);
            return (
              <button
                key={point.id}
                onClick={() => togglePainPoint(point.id)}
                className={`rounded-xl p-4 text-sm font-modern font-semibold transition-all duration-300 cursor-pointer group ${
                  isSelected
                    ? "bg-gold/30 border-2 border-gold text-graphite shadow-lg"
                    : "bg-white/10 border border-white/30 text-graphite hover:bg-gold/10 hover:border-gold/50 hover:text-gold-700"
                }`}
              >
                <p className="text-center leading-tight">{t(point.label)}</p>
              </button>
            );
          })}
        </div>

        <div className="flex justify-between">
          <GlassButton onClick={onBack} variant="secondary">
            <ArrowLeft size={18} className="mr-2" />
            {language === "pl" ? "Wstecz" : "Back"}
          </GlassButton>
          <GlassButton onClick={onNext}>
            {language === "pl" ? "Dalej" : "Next"}
            <ArrowRight size={18} className="ml-2" />
          </GlassButton>
        </div>
      </GlassCard>
    </motion.div>
  );
}
