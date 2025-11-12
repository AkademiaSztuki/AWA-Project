"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { GlassButton } from "@/components/ui/GlassButton";
import { NatureMetaphorTest } from "@/components/research";
import { useProfileWizard } from "@/components/setup/profile/ProfileWizardContext";

export default function NatureMetaphorPage() {
  const { language } = useLanguage();
  const { profileData, updateProfile, completeStep, goToPreviousStep } =
    useProfileWizard();
  const [selectedMetaphor, setSelectedMetaphor] = useState<string | undefined>(
    profileData.natureMetaphor
  );

  useEffect(() => {
    setSelectedMetaphor(profileData.natureMetaphor);
  }, [profileData.natureMetaphor]);

  const handleSelect = (id: string) => {
    setSelectedMetaphor(id);
    updateProfile({ natureMetaphor: id });
  };

  const handleNext = () => {
    if (!selectedMetaphor) return;
    completeStep({ natureMetaphor: selectedMetaphor });
  };

  return (
    <div>
      <NatureMetaphorTest onSelect={handleSelect} />

      <div className="flex justify-between mt-6">
        <GlassButton onClick={goToPreviousStep} variant="secondary">
          <ArrowLeft size={18} />
          {language === "pl" ? "Wstecz" : "Back"}
        </GlassButton>
        <GlassButton onClick={handleNext} disabled={!selectedMetaphor}>
          {language === "pl" ? "Dalej" : "Next"}
          <ArrowRight size={18} className="ml-2" />
        </GlassButton>
      </div>
    </div>
  );
}
