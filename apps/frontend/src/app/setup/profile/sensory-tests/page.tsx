"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { GlassButton } from "@/components/ui/GlassButton";
import { SensoryTestSuite } from "@/components/research";
import { ArrowLeft } from "lucide-react";
import { useProfileWizard } from "@/components/setup/profile/ProfileWizardContext";

export default function SensoryTestsPage() {
  const { language } = useLanguage();
  const { updateProfile, completeStep, goToPreviousStep } = useProfileWizard();

  const handleComplete = (results: {
    music: string;
    texture: string;
    light: string;
  }) => {
    updateProfile({ sensoryPreferences: results });
    completeStep({ sensoryPreferences: results });
  };

  return (
    <div>
      <SensoryTestSuite onComplete={handleComplete} />
      <div className="flex justify-between mt-6">
        <GlassButton onClick={goToPreviousStep} variant="secondary">
          <ArrowLeft size={18} />
          {language === "pl" ? "Wstecz" : "Back"}
        </GlassButton>
      </div>
    </div>
  );
}
