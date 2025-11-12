"use client";

import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Target } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { RoomData } from "../types";

interface RoomSummaryStepProps {
  data: RoomData;
  onComplete: () => void;
  onBack: () => void;
  isSaving: boolean;
}

export function RoomSummaryStep({
  data,
  onComplete,
  onBack,
  isSaving,
}: RoomSummaryStepProps) {
  const { language } = useLanguage();

  return (
    <motion.div
      key="summary"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <GlassCard className="p-8 text-center min-h-[600px] max-h-[85vh] overflow-auto scrollbar-hide">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-gold to-champagne flex items-center justify-center">
          <Target size={40} className="text-white" />
        </div>

        <h2 className="text-3xl lg:text-4xl font-nasalization bg-gradient-to-r from-gold to-champagne bg-clip-text text-transparent mb-4">
          {language === "pl" ? "Pomieszczenie gotowe!" : "Space Ready!"}
        </h2>

        <p className="text-graphite font-modern mb-8 max-w-xl mx-auto">
          {language === "pl"
            ? `Świetnie! "${data.name}" jest gotowe do projektowania. IDA ma wszystko czego potrzebuje aby stworzyć wnętrze które naprawdę pasuje do Ciebie.`
            : `Great! "${data.name}" is ready to design. IDA has everything needed to create an interior that truly fits you.`}
        </p>

        <div className="flex justify-center gap-4">
          <GlassButton onClick={onBack} variant="secondary" disabled={isSaving}>
            <ArrowLeft size={18} />
            {language === "pl" ? "Wstecz" : "Back"}
          </GlassButton>
          <GlassButton onClick={onComplete} className="px-8" disabled={isSaving}>
            {isSaving
              ? language === "pl"
                ? "Zapisuję..."
                : "Saving..."
              : language === "pl"
              ? "Zacznij projektowanie"
              : "Start Designing"}
            <ArrowRight size={18} className="ml-2" />
          </GlassButton>
        </div>
      </GlassCard>
    </motion.div>
  );
}
