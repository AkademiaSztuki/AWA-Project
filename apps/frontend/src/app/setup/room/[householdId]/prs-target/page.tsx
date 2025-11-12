"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { MoodGrid } from "@/components/research";
import { useRoomWizard } from "@/components/setup/room/RoomWizardContext";

export default function RoomPrsTargetPage() {
  const { language } = useLanguage();
  const { data, updateData, goToNextStep, goToPreviousStep } = useRoomWizard();

  return (
    <GlassCard className="p-6 lg:p-8">
      <h2 className="text-2xl lg:text-3xl font-nasalization bg-gradient-to-r from-gold to-champagne bg-clip-text text-transparent mb-4 text-center">
        {language === "pl"
          ? "Cel: Gdzie ma być?"
          : "Goal: Where should it be?"}
      </h2>
      <p className="text-graphite font-modern mb-6 text-center">
        {language === "pl"
          ? "Gdzie powinno być to pomieszczenie idealnie?"
          : "Where should this space be ideally?"}
      </p>

      <MoodGrid
        initialPosition={data.prsTarget}
        onPositionChange={(pos) => updateData({ prsTarget: pos })}
        mode="target"
      />

      <div className="flex justify-between mt-6">
        <GlassButton onClick={goToPreviousStep} variant="secondary">
          <ArrowLeft size={18} />
          {language === "pl" ? "Wstecz" : "Back"}
        </GlassButton>
        <GlassButton onClick={goToNextStep} disabled={!data.prsTarget}>
          {language === "pl" ? "Dalej" : "Next"}
          <ArrowRight size={18} />
        </GlassButton>
      </div>
    </GlassCard>
  );
}
