"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { GlassButton } from "@/components/ui/GlassButton";
import { BiophiliaTest } from "@/components/research";
import { useProfileWizard } from "@/components/setup/profile/ProfileWizardContext";

export default function BiophiliaPage() {
  const { language } = useLanguage();
  const { profileData, updateProfile, completeStep, goToPreviousStep } =
    useProfileWizard();
  const [score, setScore] = useState<number | undefined>(
    profileData.biophiliaScore
  );

  useEffect(() => {
    setScore(profileData.biophiliaScore);
  }, [profileData.biophiliaScore]);

  const handleSelect = (value: number) => {
    setScore(value);
    updateProfile({ biophiliaScore: value });
  };

  const handleNext = () => {
    if (score === undefined) return;
    completeStep({ biophiliaScore: score });
  };

  return (
    <div>
      <BiophiliaTest onSelect={handleSelect} />
      <div className="flex justify-between mt-6">
        <GlassButton onClick={goToPreviousStep} variant="secondary">
          <ArrowLeft size={18} />
          {language === "pl" ? "Wstecz" : "Back"}
        </GlassButton>
        <GlassButton onClick={handleNext} disabled={score === undefined}>
          {language === "pl" ? "Dalej" : "Next"}
          <ArrowRight size={18} className="ml-2" />
        </GlassButton>
      </div>
    </div>
  );
}
