"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { MoodGrid } from "@/components/research";
import { useRoomWizard } from "@/components/setup/room/RoomWizardContext";

export default function RoomPrsCurrentPage() {
  const { language } = useLanguage();
  const { data, updateData, goToNextStep, goToPreviousStep } = useRoomWizard();

  return (
    <GlassCard className="p-6 lg:p-8">
      <h2 className="text-2xl lg:text-3xl font-nasalization text-graphite mb-4 text-center">
        {language === "pl" ? "Stan obecny" : "Current State"}
      </h2>
      <p className="text-graphite font-modern mb-6 text-center">
        {language === "pl"
          ? "Gdzie jest to pomieszczenie teraz?"
          : "Where is this space now?"}
      </p>

      <MoodGrid
        initialPosition={data.prsCurrent}
        onPositionChange={(pos) => updateData({ prsCurrent: pos })}
        mode="current"
      />

      <div className="flex justify-between mt-6">
        <GlassButton onClick={goToPreviousStep} variant="secondary">
          <ArrowLeft size={18} />
          {language === "pl" ? "Wstecz" : "Back"}
        </GlassButton>
        <GlassButton
          onClick={goToNextStep}
          disabled={!data.prsCurrent}
        >
          {language === "pl" ? "Dalej" : "Next"}
          <ArrowRight size={18} />
        </GlassButton>
      </div>
    </GlassCard>
  );
}
