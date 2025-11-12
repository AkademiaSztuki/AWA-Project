"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { MoodGrid } from "@/components/research";
import { useProfileWizard } from "@/components/setup/profile/ProfileWizardContext";

export default function PrsIdealPage() {
  const { language } = useLanguage();
  const { profileData, updateProfile, completeStep, goToPreviousStep } =
    useProfileWizard();

  const [position, setPosition] = useState<{ x: number; y: number } | null>(
    profileData.prsIdeal ?? null
  );

  useEffect(() => {
    if (profileData.prsIdeal) {
      setPosition(profileData.prsIdeal);
    }
  }, [profileData.prsIdeal]);

  const handleNext = () => {
    if (!position) return;
    updateProfile({ prsIdeal: position });
    completeStep({ prsIdeal: position });
  };

  return (
    <GlassCard className="p-6 md:p-8 min-h-[600px] max-h-[85vh] overflow-auto scrollbar-hide">
      <div className="text-center mb-6">
        <h2 className="text-xl md:text-2xl font-nasalization bg-gradient-to-r from-gold to-champagne bg-clip-text text-transparent mb-2">
          {language === "pl" ? "Twoja Idealna Przestrzeń" : "Your Ideal Space"}
        </h2>
        <p className="text-graphite font-modern text-sm">
          {language === "pl"
            ? "Gdzie chciałbyś żeby Twoje przestrzenie były idealnie?"
            : "Where would you like your spaces to be ideally?"}
        </p>
      </div>

      <div className="mb-6">
        <MoodGrid
          initialPosition={position ?? undefined}
          onPositionChange={(pos) => {
            setPosition(pos);
            updateProfile({ prsIdeal: pos });
          }}
          mode="target"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <GlassButton onClick={goToPreviousStep} variant="secondary">
          <ArrowLeft size={18} />
          {language === "pl" ? "Wstecz" : "Back"}
        </GlassButton>
        <GlassButton onClick={handleNext} disabled={!position}>
          {language === "pl" ? "Dalej" : "Next"}
          <ArrowRight size={18} className="ml-2" />
        </GlassButton>
      </div>
    </GlassCard>
  );
}
